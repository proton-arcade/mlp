-- Music built-in app. Songs are kept in each browser (IndexedDB), as Notes and Calendar are.

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-5c3a9328-0562-49f7-9c24-9c953ff0eff9', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzNhN2Q0NCIvPjxwYXRoIGQ9Ik0yNiA0NFYxOGwyMi01djI2IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PGNpcmNsZSBjeD0iMjIiIGN5PSI0NCIgcj0iNiIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjQ0IiBjeT0iMzkiIHI9IjYiIGZpbGw9IiNmZmYiLz48L3N2Zz4=', 'music', 'Music', 'Your song library, saved on this computer',
    'https://builtins.namespaces.mixt.mpl/music',
    1, 1, 0, '2026-10-12 00:00:00', NULL, 0
);
