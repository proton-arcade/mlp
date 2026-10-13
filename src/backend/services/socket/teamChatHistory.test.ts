import { describe, expect, it } from 'vitest';
import {
    appendChatMessage,
    CHAT_HISTORY_LIMIT,
    CHAT_MAX_CHARS,
    deleteChatMessage,
    editChatMessage,
    normaliseChatText,
    type TeamChatMessage,
} from './teamChatHistory';

const msg = (id: string, from: string, text = 'hi'): TeamChatMessage => ({
    id,
    from,
    text,
    at: 1,
});

describe('normaliseChatText', () => {
    it('trims and strips carriage returns', () => {
        expect(normaliseChatText('  hello\r\n ')).toBe('hello');
    });
    it('rejects empty, non-string and oversize text', () => {
        expect(normaliseChatText('   ')).toBeNull();
        expect(normaliseChatText(42)).toBeNull();
        expect(normaliseChatText('x'.repeat(CHAT_MAX_CHARS + 1))).toBeNull();
        expect(normaliseChatText('x'.repeat(CHAT_MAX_CHARS))).not.toBeNull();
    });
});

describe('appendChatMessage', () => {
    it('keeps only the newest messages', () => {
        const list: TeamChatMessage[] = [];
        for (let i = 0; i < CHAT_HISTORY_LIMIT + 5; i++) {
            appendChatMessage(list, msg(`m${i}`, 'ann'));
        }
        expect(list).toHaveLength(CHAT_HISTORY_LIMIT);
        expect(list[0].id).toBe('m5');
    });
});

describe('editChatMessage', () => {
    it('lets the author change their message and marks it edited', () => {
        const list = [msg('1', 'ann', 'old')];
        const result = editChatMessage(list, '1', 'ann', 'new text');
        expect(result.ok).toBe(true);
        expect(list[0].text).toBe('new text');
        expect(list[0].edited).toBe(true);
    });
    it('refuses when the caller is not the author', () => {
        const list = [msg('1', 'ann', 'old')];
        expect(editChatMessage(list, '1', 'bob', 'x')).toEqual({
            ok: false,
            error: 'not_author',
        });
        expect(list[0].text).toBe('old');
        expect(list[0].edited).toBeUndefined();
    });
    it('reports missing messages and bad text', () => {
        const list = [msg('1', 'ann')];
        expect(editChatMessage(list, 'nope', 'ann', 'x')).toEqual({
            ok: false,
            error: 'not_found',
        });
        expect(editChatMessage(list, '1', 'ann', '  ')).toEqual({
            ok: false,
            error: 'bad_text',
        });
    });
});

describe('deleteChatMessage', () => {
    it('removes the author’s message', () => {
        const list = [msg('1', 'ann'), msg('2', 'bob')];
        const result = deleteChatMessage(list, '1', 'ann');
        expect(result.ok).toBe(true);
        expect(list.map((m) => m.id)).toEqual(['2']);
    });
    it('refuses to delete someone else’s message', () => {
        const list = [msg('1', 'ann')];
        expect(deleteChatMessage(list, '1', 'bob')).toEqual({
            ok: false,
            error: 'not_author',
        });
        expect(list).toHaveLength(1);
    });
    it('reports missing messages', () => {
        expect(deleteChatMessage([], 'x', 'ann')).toEqual({
            ok: false,
            error: 'not_found',
        });
    });
});
