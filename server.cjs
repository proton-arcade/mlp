#!/usr/bin/env node
// Run the whole project with:
//
//     node server.cjs
//
// Then open https://localhost:8835/
//
// This launcher does two things:
//
//   1. Runs tools/start.mjs, which installs dependencies, writes config.json,
//      builds the bundles, and starts the backend on http://127.0.0.1:4100.
//   2. Serves HTTPS on port 8835 in front of that backend, using a local
//      self-signed certificate for localhost and *.localhost.
//
// Port 8835 is above the privileged range, so no administrator rights are
// needed. If it cannot be opened, the launcher stops instead of starting
// half-way.
//
// Any arguments are passed through to tools/start.mjs, e.g.
// `node server.cjs --server=mixt.mpl`. In those modes no HTTPS front is started.

const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const path = require('node:path');

const rootDir = __dirname;
const args = process.argv.slice(2);

const BACKEND_PORT = 4100;
const HTTPS_PORT = 8835;
const HOST = 'localhost';
const TLS_DIR = path.join(rootDir, 'volatile', 'tls');

const isBackendMode = !args.some(a => a.startsWith('--server')) &&
    !process.env.npm_config_server;

// ---------------------------------------------------------------- certificate

const ensureCertificate = () => {
    const keyPath = path.join(TLS_DIR, `${HOST}.key`);
    const certPath = path.join(TLS_DIR, `${HOST}.crt`);
    if ( fs.existsSync(keyPath) && fs.existsSync(certPath) ) {
        return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
    }
    fs.mkdirSync(TLS_DIR, { recursive: true });
    try {
        execFileSync('openssl', [
            'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
            '-keyout', keyPath, '-out', certPath, '-days', '825',
            '-subj', `/CN=${HOST}`,
            '-addext', `subjectAltName=DNS:${HOST},DNS:*.${HOST}`,
        ], { stdio: 'ignore' });
    } catch ( err ) {
        throw new Error(
            'Could not create the local HTTPS certificate. Install OpenSSL and run `node server.cjs` again.',
        );
    }
    console.log(`Created a local HTTPS certificate in ${path.relative(rootDir, TLS_DIR)}/.`);
    return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
};

// ---------------------------------------------------------------- HTTPS front

// Re-create the request head exactly as the browser sent it, so the backend
// sees the original headers (Host, cookies, Sec-WebSocket-*) on upgrades.
const rawRequestHead = (req) => {
    const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
    for ( let i = 0; i < req.rawHeaders.length; i += 2 ) {
        lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
    }
    return lines.join('\r\n') + '\r\n\r\n';
};

const startHttpsFront = () => new Promise((resolve, reject) => {
    const tls = ensureCertificate();

    const server = https.createServer(tls, (req, res) => {
        const upstream = http.request({
            host: '127.0.0.1',
            port: BACKEND_PORT,
            method: req.method,
            path: req.url,
            headers: {
                ...req.headers,
                'x-forwarded-proto': 'https',
                // Overwrite (never append to) any client-supplied value: this
                // front is the trust boundary, so the backend sees one hop.
                'x-forwarded-for': req.socket.remoteAddress ?? '',
                'x-forwarded-host': req.headers.host ?? HOST,
            },
        }, (upRes) => {
            res.writeHead(upRes.statusCode ?? 502, upRes.headers);
            upRes.pipe(res);
        });
        upstream.on('error', () => {
            if ( res.headersSent ) {
                res.destroy();
                return;
            }
            res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
            res.end('Mixt is still starting. Refresh this page in a moment.\n');
        });
        req.pipe(upstream);
    });

    // WebSocket and other Upgrade requests: copy bytes both ways.
    server.on('upgrade', (req, socket, head) => {
        const upstream = net.connect(BACKEND_PORT, '127.0.0.1', () => {
            upstream.write(rawRequestHead(req));
            if ( head.length ) upstream.write(head);
            socket.pipe(upstream).pipe(socket);
        });
        upstream.on('error', () => socket.destroy());
        socket.on('error', () => upstream.destroy());
    });

    server.once('error', (err) => {
        if ( err.code === 'EACCES' || err.code === 'EPERM' ) {
            reject(new Error(
                `Port ${HTTPS_PORT} cannot be opened (permission denied). ` +
                'Check that no firewall or security policy blocks it.',
            ));
        } else if ( err.code === 'EADDRINUSE' ) {
            reject(new Error(
                `Port ${HTTPS_PORT} is already in use. Stop the program using it, then run \`node server.cjs\` again.`,
            ));
        } else {
            reject(err);
        }
    });

    server.listen(HTTPS_PORT, '0.0.0.0', () => resolve(server));
});

// ---------------------------------------------------------------- launch

// The HTTPS front is bound first. Only if that succeeds is the backend started,
// so a refused port 8835 stops the launcher before any install or build work.
// The child runs in its own process group so that stopping the launcher also
// stops everything it started (the backend is a grandchild of this process).

let child = null;
let front = null;
let shuttingDown = false;
let failed = false;

const killGroup = (signal) => {
    if ( !child ) return;
    try {
        process.kill(-child.pid, signal);
    } catch {
        // The group has already exited.
    }
};

const shutdown = (signal) => {
    if ( shuttingDown ) return;
    shuttingDown = true;
    if ( front ) front.close();
    if ( child && child.exitCode === null && child.signalCode === null ) killGroup(signal);
    else if ( !child ) process.exit(failed ? 1 : 0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

const launchBackend = () => {
    child = spawn(
        process.execPath,
        [path.join(rootDir, 'tools', 'start.mjs'), ...args],
        {
            stdio: 'inherit',
            cwd: rootDir,
            detached: true,
            // The backend listens on loopback only, so the HTTPS front is the
            // single way in. Docker deployments do not run this launcher.
            env: { ...process.env, MIXT_BIND_HOST: '127.0.0.1' },
        },
    );
    child.on('exit', (code, signal) => {
        if ( front ) front.close();
        // Make sure nothing started by the child outlives it.
        killGroup('SIGTERM');
        if ( signal && !failed ) process.kill(process.pid, signal);
        else process.exitCode = failed ? 1 : (code ?? 1);
    });
};

if ( isBackendMode ) {
    startHttpsFront().then((server) => {
        front = server;
        console.log(`\nHTTPS is listening. Open https://${HOST}:${HTTPS_PORT}/ once the desktop has booted.`);
        console.log('The browser will warn about the self-signed certificate. Accept it for BOTH of these addresses,');
        console.log('or the API and live connections (chat, notifications) fail in Firefox:');
        console.log(`  https://${HOST}:${HTTPS_PORT}/`);
        console.log(`  https://api.${HOST}:${HTTPS_PORT}/\n`);
        launchBackend();
    }).catch((err) => {
        console.error(err.message);
        failed = true;
        process.exitCode = 1;
    });
} else {
    launchBackend();
}
