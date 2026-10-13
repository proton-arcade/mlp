/*
 * Team Chat message rules, kept free of socket code so they can be tested.
 * Only the author of a message may edit or delete it.
 */

export interface TeamChatMessage {
    id: string;
    from: string;
    text: string;
    at: number;
    /** Set when the author has edited the message. */
    edited?: boolean;
}

export const CHAT_HISTORY_LIMIT = 200;
export const CHAT_MAX_CHARS = 2000;

/** Trim and normalise a message body; null when it is empty or too long. */
export function normaliseChatText(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const text = raw.replace(/\r/g, '').trim();
    if (!text || text.length > CHAT_MAX_CHARS) return null;
    return text;
}

/** Append a message and keep only the newest CHAT_HISTORY_LIMIT entries. */
export function appendChatMessage(
    list: TeamChatMessage[],
    message: TeamChatMessage,
): TeamChatMessage[] {
    list.push(message);
    if (list.length > CHAT_HISTORY_LIMIT) {
        list.splice(0, list.length - CHAT_HISTORY_LIMIT);
    }
    return list;
}

export type ChatMutation =
    | { ok: true; message: TeamChatMessage }
    | { ok: false; error: 'not_found' | 'not_author' | 'bad_text' };

/** Replace the text of one of `from`'s own messages. */
export function editChatMessage(
    list: TeamChatMessage[],
    id: string,
    from: string,
    rawText: unknown,
): ChatMutation {
    const message = list.find((m) => m.id === id);
    if (!message) return { ok: false, error: 'not_found' };
    if (message.from !== from) return { ok: false, error: 'not_author' };
    const text = normaliseChatText(rawText);
    if (!text) return { ok: false, error: 'bad_text' };
    message.text = text;
    message.edited = true;
    return { ok: true, message };
}

/** Remove one of `from`'s own messages. */
export function deleteChatMessage(
    list: TeamChatMessage[],
    id: string,
    from: string,
): ChatMutation & { removed?: boolean } {
    const index = list.findIndex((m) => m.id === id);
    if (index < 0) return { ok: false, error: 'not_found' };
    const message = list[index];
    if (message.from !== from) return { ok: false, error: 'not_author' };
    list.splice(index, 1);
    return { ok: true, message, removed: true };
}
