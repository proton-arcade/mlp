/*
 * Terminal: a sandboxed command line that runs in this browser tab. It has a
 * fixed set of built-in commands (help, calc, date, open, and so on). It does
 * not run programs on the server and cannot reach the file system.
 * Calculator input is parsed by a small grammar; nothing is passed to eval().
 */
(function () {
    'use strict';

    const out = document.getElementById('out');
    const form = document.getElementById('bar');
    const input = document.getElementById('in');
    const history = [];
    let hIndex = 0;

    const APPS = ['signatures', 'presentation', 'spreadsheet', 'whiteboard',
        'notes', 'calendar', 'mail', 'contacts', 'terminal'];

    function print (text, cls) {
        const div = document.createElement('div');
        div.className = 'line' + (cls ? ' ' + cls : '');
        div.textContent = text;
        out.appendChild(div);
        out.scrollTop = out.scrollHeight;
    }

    // ---- calc: numbers, + - * / % ^, parentheses, unary minus. No eval. ----
    function calc (src) {
        const tokens = String(src).match(/\d+(\.\d+)?|[-+*/%^()]|\s+|[^\s]/g) || [];
        let i = 0;
        const parts = tokens.filter((t) => !/^\s+$/.test(t));
        const peek = () => parts[i];
        const take = () => parts[i++];
        function expr () {
            let v = term();
            while ( peek() === '+' || peek() === '-' ) { const op = take(); const r = term(); v = op === '+' ? v + r : v - r; }
            return v;
        }
        function term () {
            let v = factor();
            while ( peek() === '*' || peek() === '/' || peek() === '%' ) {
                const op = take(); const r = factor();
                if ( op === '*' ) v *= r;
                else if ( op === '/' ) { if ( r === 0 ) throw new Error('division by zero'); v /= r; }
                else v %= r;
            }
            return v;
        }
        function factor () {
            const base = unary();
            if ( peek() === '^' ) { take(); return Math.pow(base, factor()); }
            return base;
        }
        function unary () {
            if ( peek() === '-' ) { take(); return -unary(); }
            if ( peek() === '+' ) { take(); return unary(); }
            return primary();
        }
        function primary () {
            const t = take();
            if ( t === undefined ) throw new Error('unexpected end of expression');
            if ( t === '(' ) { const v = expr(); if ( take() !== ')' ) throw new Error('missing )'); return v; }
            if ( /^\d/.test(t) ) return Number(t);
            throw new Error(`unexpected "${t}"`);
        }
        if ( ! parts.length ) throw new Error('usage: calc <expression>');
        const value = expr();
        if ( i !== parts.length ) throw new Error(`unexpected "${parts[i]}"`);
        if ( ! Number.isFinite(value) ) throw new Error('result is not a finite number');
        return value;
    }

    const COMMANDS = {
        help () {
            print('Commands run inside this browser tab only:');
            print('  help              show this list');
            print('  clear             clear the screen');
            print('  echo <text>       print text');
            print('  date              current date and time');
            print('  whoami            the account name shown on the desktop');
            print('  pwd               the current folder (always /home/mixt)');
            print('  history           commands entered in this session');
            print('  calc <expr>       arithmetic, e.g. calc (3 + 4) * 2 ^ 3');
            print('  apps              list the built-in apps');
            print('  open <app>       open a built-in app in a new tab, e.g. open notes');
        },
        clear () { out.innerHTML = ''; },
        echo (args) { print(args.join(' ')); },
        date () { print(new Date().toString()); },
        whoami () { print('mixt'); },
        pwd () { print('/home/mixt'); },
        history () { history.forEach((h, n) => print(String(n + 1).padStart(4) + '  ' + h)); },
        calc (args) { print(String(calc(args.join(' ')))); },
        apps () { print(APPS.join('  ')); },
        open (args) {
            const name = (args[0] || '').toLowerCase();
            if ( ! APPS.includes(name) ) throw new Error(`no built-in app called "${name}". Try "apps".`);
            window.open(`/builtin/${name}/index.html`, '_blank', 'noopener');
            print(`opened ${name} in a new tab`);
        },
    };

    function run (line) {
        const [cmd, ...args] = line.trim().split(/\s+/);
        if ( ! cmd ) return;
        const fn = COMMANDS[cmd];
        if ( ! fn ) { print(`${cmd}: command not found. Type "help".`, 'err'); return; }
        try { fn(args); } catch (e) { print(e.message, 'err'); }
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const line = input.value;
        print('mixt@desk:~$ ' + line, 'prompt');
        if ( line.trim() ) { history.push(line.trim()); hIndex = history.length; }
        input.value = '';
        run(line);
    });

    input.addEventListener('keydown', (e) => {
        if ( e.key === 'ArrowUp' && history.length ) {
            hIndex = Math.max(0, hIndex - 1);
            input.value = history[hIndex] || '';
            e.preventDefault();
        } else if ( e.key === 'ArrowDown' ) {
            hIndex = Math.min(history.length, hIndex + 1);
            input.value = history[hIndex] || '';
            e.preventDefault();
        }
    });

    print('Mixt terminal. Commands run in this tab only; type "help" to start.', 'muted');
    input.focus();
})();
