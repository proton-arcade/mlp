-- Browser app: opens the sites in the internet folder, searched by MPLmit.
-- Offline by design: outside addresses are blocked, not loaded.

INSERT INTO `apps` (
    `uid`,
    `owner_user_id`,
    `icon`,
    `name`,
    `title`,
    `description`,
    `index_url`,
    `approved_for_listing`,
    `approved_for_opening_items`,
    `approved_for_incentive_program`,
    `timestamp`,
    `last_review`,
    `godmode`
) VALUES (
    'app-a00127d4-a299-4a2a-b8b6-d2f16acc4fae',
    1,
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIyOCIgZmlsbD0iIzY4YjcyMyIvPjxjaXJjbGUgY3g9IjMyIiBjeT0iMzIiIHI9IjE4IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iNCIvPjxwYXRoIGQ9Ik0xNCAzMmgzNk0zMiAxNGMtOCAxMC04IDI2IDAgMzZNMzIgMTRjOCAxMCA4IDI2IDAgMzYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIzIi8+PC9zdmc+',
    'browser',
    'Browser',
    'Browse the stored internet with MPLmit search',
    'https://builtins.namespaces.mixt.mpl/browser',
    1, 1, 0,
    '2026-10-11 00:00:00',
    NULL,
    0
);
