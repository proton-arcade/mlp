# `@mixt/cli`

> **Beta (0.x).** Mixt OS CLI — developer tooling from your terminal.

## Install

```sh
npm install -g @mixt/cli
```

Requires Node 18+.

## Authentication

Log in once via the browser and your token is stored for later commands. For
automation, set `MIXT_AUTH_TOKEN` and the CLI skips login entirely.

```sh
mixt login                                # web browser flow (interactive)
echo "$TOKEN" | mixt login --with-token   # token via stdin
mixt logout
mixt whoami
```

## Files

One-shot file operations against your Mixt OS drive. A remote path carries a
`mixt:` prefix and is absolute from your home directory, `-` is stdin or
stdout, and anything else is local — so the direction of a transfer is read off
the operands and there is no `--upload` flag to remember.

```sh
mixt fs ls mixt:/Desktop [-l] [--json]
mixt fs cat mixt:/notes.txt
mixt fs cp <source> <destination> [-r] [-n] [--concurrency n] [--dry-run]
mixt fs mv mixt:/a mixt:/b
mixt fs rm mixt:/old [-r] [-y] [--dry-run]
mixt fs mkdir mixt:/logs [-p]
mixt fs stat mixt:/notes.txt [--json]
```

`cp` picks its implementation from the pair of operands:

| From       | To         | What happens                                 |
| ---------- | ---------- | -------------------------------------------- |
| local      | `mixt:/…` | upload                                       |
| `mixt:/…` | local      | download                                     |
| `mixt:/…` | `mixt:/…` | copied server-side, never through the client |
| `-`        | `mixt:/…` | stdin is written to the file                 |
| `mixt:/…` | `-`        | raw bytes to stdout                          |

Two local paths — or two of anything else — is an error rather than a guess.
`mv` is remote-to-remote only for now: deleting local files after a failed
upload is not a first impression worth making.

### Piping

Status, progress and prompts go to stderr and data goes to stdout, so a
listing feeds straight back in:

```sh
mixt fs ls mixt:/logs | xargs -n1 mixt fs cat
```

A terminal gets the human view — bare names, aligned `-l` columns, a progress
spinner. A pipe gets `mixt:`-prefixed paths, one per line, and `--json` gives
the whole entry.

### App storage

`--app` resolves `mixt:/` against one app's storage directory
(`~/AppData/<uid>`) instead of your home directory. It takes the same
identifiers as `mixt kv connect`: an app name, a worker name or URL, or a uid.

```console
$ mixt fs ls --app notes mixt:/
mixt:/settings.json
$ mixt fs rm -r --app notes mixt:/cache
rm -r mixt:/cache → ~/AppData/app-1f2e3d4c…/cache (412 entries) [notes (app-1f2e3d4c…)]
```

It is a flag and nothing else — no environment variable, no saved default.
Because it changes what an absolute path means, the rebasing has to be visible
in the command itself, so everything that changes or removes files echoes the
path it resolved to. Paths are clamped to that root: `mixt:/../../Documents`
is an error, not an escape.

### Removing things

- `rm` needs `-r` for a directory, and prints the entry count before it goes.
- `-r` prompts on a terminal and requires `-y` anywhere else.
- Bare `mixt:/` is refused — no one-liner should empty a whole drive or app store.
- Anything recursive takes `--dry-run`.

### Transfers

Bulk copies move 8 files at a time (`--concurrency`, 1–32) and retry what
failed for a reason that might not repeat. A partial failure doesn't abort the
run: the failures are named at the end and the exit code is non-zero, so
uploading 8,000 files doesn't start over because number 3,000 hiccuped. `-n`
skips what already exists; without it `cp` overwrites, like `cp`.

## Sites

Deploy a static directory to a `*.mixt.site` subdomain, then list, inspect, or
remove your sites. Run with no arguments and the CLI prompts for the directory
and subdomain.

```sh
mixt site deploy [dir] [subdomain]   # both positional, both optional
mixt site list
mixt site get <subdomain>
mixt site delete <subdomain> [-y]
```

## Workers

Deploy a JavaScript file as a serverless worker served at `<name>.mixt.work`,
then list, inspect, or remove it.

```sh
mixt worker deploy [file] [name]
mixt worker list
mixt worker get <name>
mixt worker delete <name> [-y]
```

## Apps (read-only)

Browse the apps registered on your account. These commands are read-only.

```sh
mixt app list
mixt app get <name>
```

## Key-value store

Open an interactive JavaScript shell against the key-value store of one app or
worker. Takes an app name, a worker name or its `*.mixt.work` URL, or a uid —
a worker resolves to the sandbox app it was deployed with, which is where its
`mixt.kv` data lives. An app name wins a tie with a worker of the same name;
the worker's URL asks for the worker instead.

```sh
mixt kv connect <app>
mixt kv connect <worker>
mixt kv connect https://<worker>.mixt.work
```

Every `mixt.kv` method is bound to that app and available bare, so pasted
docs work either way:

```console
$ mixt kv connect notes
✔ Connected to notes (app-1f2e3d4c…) · 12 keys
kv(notes)> set("greeting", "hi")
true
kv(notes)> get("greeting")
'hi'
kv(notes)> list("gre", true)
[ { key: 'greeting', value: 'hi' } ]
kv(notes)> mixt.kv.incr("visits")
1
```

A worker connects the same way, and the prompt says so:

```console
$ mixt kv connect my-api
✔ Connected to worker my-api (app-9a8b7c6d…) · 3 keys
kv(worker:my-api)> list()
[ 'visits' ]
```

Results are awaited for you — `get("k")` prints the value, not a pending
promise — and `_` holds the last one. `.help` lists the methods, `.clear`
resets the session, `.exit` (or Ctrl-D) quits. Needs a terminal.
