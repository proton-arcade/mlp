#!/usr/bin/env node
// Run the whole project with:
//
//     node server.cjs
//
// Then open https://mixt.localhost/
//
// This launcher does two things:
//
//   1. Runs tools/start.mjs, which installs dependencies, writes config.json,
//      builds the bundles, and starts the backend on http://127.0.0.1:4100.
//   2. Serves HTTPS on port 443 in front of that backend, using a local
//      self-signed certificate for mixt.localhost and *.mixt.localhost.
//
// Port 443 needs administrator rights on Linux and macOS. If it cannot be
// opened, the launcher stops with instructions instead of starting half-way.
//
// Any arguments are passed through to tools/start.mjs, e.g.
// `node server.cjs --server=puter.com`. In those modes no HTTPS front is started.

const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const path = require('node:path');

const rootDir = __dirname;
const args = process.argv.slice(2);

const BACKEND_PORT = 4100;
const HTTPS_PORT = 443;
const HOST = 'mixt.localhost';
const TLS_DIR = path.join(rootDir, 'volatile', 'tls');

const isBackendMode = !args.some(a => a.startsWith('--server') || a === '--smtp') &&
    !process.env.npm_config_server && !process.env.npm_config_smtp;

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
                `Port ${HTTPS_PORT} needs administrator rights.\n` +
                '  Run:  sudo node server.cjs\n' +
                '  or allow Node to bind low ports once:\n' +
                '        sudo setcap \'cap_net_bind_service=+ep\' "$(which node)"',
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

// The child runs in its own process group so that stopping the launcher also
// stops everything it started (the backend is a grandchild of this process).
const child = spawn(
    process.execPath,
    [path.join(rootDir, 'tools', 'start.mjs'), ...args],
    { stdio: 'inherit', cwd: rootDir, detached: true },
);

let front = null;
let shuttingDown = false;

const killGroup = (signal) => {
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
    if ( child.exitCode === null && child.signalCode === null ) killGroup(signal);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

let failed = false;

child.on('exit', (code, signal) => {
    if ( front ) front.close();
    // Make sure nothing started by the child outlives it.
    killGroup('SIGTERM');
    if ( signal && !failed ) process.kill(process.pid, signal);
    else process.exitCode = failed ? 1 : (code ?? 1);
});

if ( isBackendMode ) {
    startHttpsFront().then((server) => {
        front = server;
        console.log(`\nHTTPS is listening. Open https://${HOST}/ once the desktop has booted.`);
        console.log('The browser will warn about the self-signed certificate; accept it for this local address.\n');
    }).catch((err) => {
        console.error(err.message);
        failed = true;
        shutdown('SIGTERM');
    });
}
