import { describe, expect, it } from 'vitest';

import {
  appRoot,
  assertMovable,
  copyDirection,
  HOME_ROOT,
  isRoot,
  kindOf,
  remoteBasename,
  remoteDirname,
  remoteJoin,
  resolveRemote,
  toOperand,
} from './remotePath.js';

describe('kindOf', () => {
  it('reads the side of the wire off the operand', () => {
    expect(kindOf('mixt:/Desktop')).toBe('remote');
    expect(kindOf('-')).toBe('stdio');
    expect(kindOf('./dist')).toBe('local');
    expect(kindOf('dist')).toBe('local');
    // A local file that happens to be named like the prefix is still local.
    expect(kindOf('/tmp/mixt')).toBe('local');
  });
});

describe('resolveRemote', () => {
  it('resolves against the home directory, not the system root', () => {
    expect(resolveRemote('mixt:/Desktop/notes.txt')).toBe('~/Desktop/notes.txt');
    expect(resolveRemote('mixt:/')).toBe(HOME_ROOT);
  });

  it('collapses empty and current-directory components', () => {
    expect(resolveRemote('mixt://a//b/./c')).toBe('~/a/b/c');
  });

  it('rebases onto an app store without changing the operand', () => {
    const root = appRoot('app-1f2e');
    expect(resolveRemote('mixt:/dist', root)).toBe('~/AppData/app-1f2e/dist');
    expect(resolveRemote('mixt:/', root)).toBe('~/AppData/app-1f2e');
  });

  it('refuses to climb out of the root instead of rebasing quietly', () => {
    expect(() => resolveRemote('mixt:/../../Documents', appRoot('app-1'))).toThrow(/cannot contain/);
    expect(() => resolveRemote('mixt:/dist/../..')).toThrow(/cannot contain/);
  });

  it('refuses relative remote paths, which have nothing to be relative to', () => {
    expect(() => resolveRemote('mixt:dist')).toThrow(/must be absolute/);
  });

  it('refuses an operand that is not remote at all', () => {
    expect(() => resolveRemote('./dist')).toThrow(/not a remote path/);
  });
});

describe('isRoot', () => {
  it('recognizes the root of whichever tree is in play', () => {
    expect(isRoot(resolveRemote('mixt:/'))).toBe(true);
    expect(isRoot(resolveRemote('mixt:/x'))).toBe(false);

    const root = appRoot('app-1');
    expect(isRoot(resolveRemote('mixt:/', root), root)).toBe(true);
    expect(isRoot(resolveRemote('mixt:/dist', root), root)).toBe(false);
  });
});

describe('toOperand', () => {
  it('round-trips a resolved path back into something a command accepts', () => {
    expect(toOperand('~/logs/a.txt')).toBe('mixt:/logs/a.txt');
    expect(toOperand(HOME_ROOT)).toBe('mixt:/');

    const root = appRoot('app-1');
    expect(toOperand(`${root}/dist/app.js`, root)).toBe('mixt:/dist/app.js');
  });
});

describe('remote path helpers', () => {
  it('stays POSIX regardless of the local platform', () => {
    expect(remoteBasename('~/a/b/c.txt')).toBe('c.txt');
    expect(remoteDirname('~/a/b/c.txt')).toBe('~/a/b');
    expect(remoteDirname('~/a')).toBe(HOME_ROOT);
    expect(remoteJoin('~/a/', 'b', 'c')).toBe('~/a/b/c');
  });
});

describe('copyDirection', () => {
  it('picks the implementation from the operand pair', () => {
    expect(copyDirection('./dist', 'mixt:/dist')).toBe('upload');
    expect(copyDirection('mixt:/dist', './dist')).toBe('download');
    expect(copyDirection('mixt:/a', 'mixt:/b')).toBe('remoteCopy');
    expect(copyDirection('-', 'mixt:/a')).toBe('writeStdin');
    expect(copyDirection('mixt:/a', '-')).toBe('readStdout');
  });

  it('refuses the ambiguous pairs loudly', () => {
    expect(() => copyDirection('./a', './b')).toThrow(/job for cp/);
    expect(() => copyDirection('-', '-')).toThrow(/Cannot copy stdin to stdout/);
    expect(() => copyDirection('-', './a')).toThrow(/Cannot copy/);
    expect(() => copyDirection('./a', '-')).toThrow(/Cannot copy/);
  });
});

describe('assertMovable', () => {
  it('allows remote to remote', () => {
    expect(() => assertMovable('mixt:/a', 'mixt:/b')).not.toThrow();
  });

  it('refuses to cross the boundary rather than half-implement it', () => {
    expect(() => assertMovable('./a', 'mixt:/b')).toThrow(/cannot cross/);
    expect(() => assertMovable('mixt:/a', './b')).toThrow(/cannot cross/);
    expect(() => assertMovable('./a', './b')).toThrow(/job for mv/);
    expect(() => assertMovable('-', 'mixt:/b')).toThrow(/does not read stdin/);
  });
});
