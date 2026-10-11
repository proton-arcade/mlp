#!/usr/bin/env node
// Entry point for `npm start`. One command takes a fresh checkout to a running desktop:
//
//   1. installs dependencies if they are missing
//   2. writes a git-ignored config.json with random secrets if there is none
//   3. builds the desktop (GUI) and SDK bundles when they are missing or older than their sources
//   4. builds the backend and runs it on http://puter.localhost:4100
//
// Other modes, all optional:
//
//     npm start --server=puter.com              serve the GUI against a remote backend (no local server)
//     npm start -- --extensions=<dir>           bundle out-of-tree GUI extensions (with --server)
//     npm start -- --smtp                       run the inbound SMTP receiver instead

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
    existsSync,
    readFileSync,
    readdirSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { npmSpawnArgs } from './npmSpawn.mjs';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Node 18.19+ (module.register for the node:sqlite shim; see
// src/backend/util/nodeCompat.ts). Newer majors are supported as-is.
const MIN_NODE = [18, 19];
const SECRET_KEYS = ['jwt_secret_v2', 'url_signature_secret'];
const SHIPPED_PLACEHOLDER = /change-me/;

const GUI_BUNDLE = path.join(rootDir, 'src', 'gui', 'dist', 'bundle.min.js');
const SDK_BUNDLE = path.join(rootDir, 'src', 'puter-js', 'dist', 'puter.js');
const GUI_SOURCES = [path.join(rootDir, 'src', 'gui')];
const SDK_SOURCES = [
    path.join(rootDir, 'src', 'puter-js', 'src'),
    path.join(rootDir, 'src', 'puter-js', 'webpack.config.js'),
];

// `npm start --flag=x` arrives as the npm_config_<flag> env var;
// `npm start -- --flag=x` arrives as a regular argument.
const getFlag = (name) => {
    for ( const arg of process.argv.slice(2) ) {
        if ( arg.startsWith(`--${name}=`) ) return arg.slice(name.length + 3);
    }
    return process.env[`npm_config_${name}`] || null;
};

// Relative paths resolve against where `npm start` was invoked (INIT_CWD),
// not the repo root npm runs scripts from.
const resolveExtensionPaths = (value) => value
    .split(';')
    .filter(Boolean)
    .map(p => path.resolve(process.env.INIT_CWD ?? process.cwd(), p))
    .join(';');

const run = (cmd, args, opts = {}) => new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', cwd: rootDir, ...opts });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
        if ( code === 0 || signal ) resolve();
        else reject(new Error(`\`${[cmd, ...args].join(' ')}\` exited with code ${code}`));
    });
});

const runNpm = (args, opts) => run(...npmSpawnArgs(args, opts));

const checkNodeVersion = () => {
    const [major, minor] = process.versions.node.split('.').map(Number);
    const tooOld = major < MIN_NODE[0] || (major === MIN_NODE[0] && minor < MIN_NODE[1]);
    if ( tooOld ) {
        throw new Error(
            `Mixt needs Node.js ${MIN_NODE[0]}.${MIN_NODE[1]} or newer (this is ${process.version}). ` +
            'Install a current Node.js from https://nodejs.org and run `npm start` again.',
        );
    }
};

const ensureDependencies = async () => {
    if ( existsSync(path.join(rootDir, 'node_modules', '.package-lock.json')) ) return;
    console.log('Installing dependencies (first run only)...');
    await runNpm(['install']);
};

// Secrets are generated once and kept in config.json, which is git-ignored, so
// every checkout gets its own and no shipped placeholder ever reaches a server.
const ensureLocalConfig = () => {
    const configPath = path.join(rootDir, 'config.json');
    let config = {};
    if ( existsSync(configPath) ) {
        config = JSON.parse(readFileSync(configPath, 'utf8'));
    }
    let changed = !existsSync(configPath);
    for ( const key of SECRET_KEYS ) {
        if ( !config[key] || SHIPPED_PLACEHOLDER.test(config[key]) ) {
            config[key] = randomBytes(32).toString('hex');
            changed = true;
        }
    }
    if ( changed ) {
        writeFileSync(configPath, JSON.stringify(config, null, 4) + '\n');
        console.log('Wrote config.json with fresh local secrets.');
    }
};

// Newest modification time under the given paths, skipping build output.
const newestMtime = (targets) => {
    let newest = 0;
    const visit = (entry) => {
        const stat = statSync(entry, { throwIfNoEntry: false });
        if ( !stat ) return;
        if ( stat.isDirectory() ) {
            const name = path.basename(entry);
            if ( name === 'node_modules' || name === 'dist' || name.startsWith('.') ) return;
            for ( const child of readdirSync(entry) ) visit(path.join(entry, child));
        } else {
            newest = Math.max(newest, stat.mtimeMs);
        }
    };
    targets.forEach(visit);
    return newest;
};

const isStale = (bundle, sources) => {
    if ( !existsSync(bundle) ) return true;
    return newestMtime(sources) > statSync(bundle).mtimeMs;
};

const ensureBundles = async () => {
    if ( isStale(GUI_BUNDLE, GUI_SOURCES) ) {
        console.log('Building the desktop...');
        await run(process.execPath, ['build.js'], { cwd: path.join(rootDir, 'src', 'gui') });
    }
    if ( isStale(SDK_BUNDLE, SDK_SOURCES) ) {
        console.log('Building the SDK...');
        await runNpm(['run', 'build'], { cwd: path.join(rootDir, 'src', 'puter-js') });
    }
};

const startServer = () => run(process.execPath, [
    '--enable-source-maps',
    '-r', './dist/src/backend/telemetry.js',
    './dist/src/backend/index.js',
]);

const server = getFlag('server');
const extensions = getFlag('extensions');
const smtp =
    process.argv.slice(2).includes('--smtp') ||
    Boolean(process.env.npm_config_smtp);

try {
    checkNodeVersion();
    if ( smtp ) {
        await runNpm(['run', 'build:ts']);
        await run(process.execPath, [
            '--enable-source-maps',
            '-r', './dist/src/backend/telemetry.js',
            './dist/src/backend/smtp/index.js',
        ]);
    } else if ( server ) {
        const args = ['dev-server.js', `--server=${server}`];
        if ( extensions ) args.push(`--extensions=${resolveExtensionPaths(extensions)}`);
        await run(process.execPath, args, {
            cwd: path.join(rootDir, 'src', 'gui'),
        });
    } else {
        if ( extensions ) {
            console.warn('--extensions only applies to --server (GUI-only) mode; ignoring.');
        }
        await ensureDependencies();
        ensureLocalConfig();
        await runNpm(['run', 'setupExtensions']);
        await runNpm(['run', 'build:ts']);
        await ensureBundles();
        await startServer();
    }
} catch (err) {
    console.error(err.message);
    process.exit(1);
}
