-- G-Talk built-in app: one-to-one chat between two signed-in users. Messages are
-- relayed by the Mixt socket server and kept in memory, as in Team Chat.

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-1f9d028f-c38b-4ee1-9eae-398b7d17a076', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxNCIgZmlsbD0iIzFhNzNlOCIvPjxwYXRoIGQ9Ik0xNCAxOGgzNmE0IDQgMCAwIDEgNCA0djE4YTQgNCAwIDAgMS00IDRIMzBsLTkgOHYtOGgtN2E0IDQgMCAwIDEtNC00VjIyYTQgNCAwIDAgMSA0LTR6IiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iMjQiIGN5PSIzMSIgcj0iMyIgZmlsbD0iIzFhNzNlOCIvPjxjaXJjbGUgY3g9IjMyIiBjeT0iMzEiIHI9IjMiIGZpbGw9IiMxYTczZTgiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjMxIiByPSIzIiBmaWxsPSIjMWE3M2U4Ii8+PC9zdmc+',
    'g-talk', 'G-Talk', 'One-to-one chat with another user.', 'https://builtins.namespaces.mixt.mpl/g-talk',
    1, 1, 0, '2026-10-13 00:00:00', NULL, 0
);
