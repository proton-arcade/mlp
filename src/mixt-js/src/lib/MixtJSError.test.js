import { describe, expect, it } from 'vitest';
import { MixtJSError } from './MixtJSError.js';

describe('MixtJSError', () => {
    it('is a real Error carrying message and code', () => {
        const err = new MixtJSError('Key cannot be undefined', 'key_undefined');
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(MixtJSError);
        expect(err.name).toBe('MixtJSError');
        expect(err.message).toBe('Key cannot be undefined');
        expect(err.code).toBe('key_undefined');
        expect(typeof err.stack).toBe('string');
    });

    it('serializes and destructures like the legacy plain { message, code }', () => {
        const err = new MixtJSError('bad request', 'invalid_request');
        const { message, code } = err;
        expect({ message, code }).toEqual({ message: 'bad request', code: 'invalid_request' });
        expect(JSON.parse(JSON.stringify(err))).toEqual({
            message: 'bad request',
            code: 'invalid_request',
        });
    });

    it('attaches extra fields for backward-compatible shapes', () => {
        const err = new MixtJSError('Name is required', 'invalid_request', {
            success: false,
            error: { code: 'invalid_request', message: 'Name is required' },
        });
        // Both the new top-level access and the legacy nested access work.
        expect(err.code).toBe('invalid_request');
        expect(err.success).toBe(false);
        expect(err.error).toEqual({ code: 'invalid_request', message: 'Name is required' });
    });

    it('omits code when none is given', () => {
        const err = new MixtJSError('something happened');
        expect('code' in err).toBe(false);
        expect(JSON.parse(JSON.stringify(err))).toEqual({ message: 'something happened' });
    });

    describe('from()', () => {
        it('passes an existing MixtJSError through untouched', () => {
            const original = new MixtJSError('x', 'y');
            expect(MixtJSError.from(original)).toBe(original);
        });

        it('normalizes a plain { message, code } object, keeping extra fields', () => {
            const err = MixtJSError.from({ message: 'nope', code: 'denied', detail: 42 });
            expect(err).toBeInstanceOf(MixtJSError);
            expect(err.message).toBe('nope');
            expect(err.code).toBe('denied');
            expect(err.detail).toBe(42);
        });

        it('wraps a bare string', () => {
            const err = MixtJSError.from('boom');
            expect(err.message).toBe('boom');
            expect('code' in err).toBe(false);
        });

        it('falls back to a generic message for shapeless values', () => {
            expect(MixtJSError.from(undefined).message).toBe('Unknown error');
            expect(MixtJSError.from({}).message).toBe('Unknown error');
        });
    });
});
