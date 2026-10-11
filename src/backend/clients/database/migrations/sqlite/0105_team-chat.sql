-- Team Chat built-in app. Channel messages are relayed by the Mixt socket server and kept in memory.
INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-3e7c1f0a-8d2b-4a6e-9c51-b4f2e8d07a16', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzVlMzViMSIvPjxwYXRoIGQ9Ik0xNCAxNmgzNmE0IDQgMCAwIDEgNCA0djUwIiBmaWxsPSJub25lIi8+PHJlY3QgeD0iMTQiIHk9IjE2IiB3aWR0aD0iMzYiIGhlaWdodD0iMjQiIHJ4PSI2IiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTIyIDQwbC00IDggMTItOHoiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSIyNSIgY3k9IjI4IiByPSIyLjUiIGZpbGw9IiM1ZTM1YjEiLz48Y2lyY2xlIGN4PSIzMiIgY3k9IjI4IiByPSIyLjUiIGZpbGw9IiM1ZTM1YjEiLz48Y2lyY2xlIGN4PSIzOSIgY3k9IjI4IiByPSIyLjUiIGZpbGw9IiM1ZTM1YjEiLz48L3N2Zz4=', 'team-chat', 'Team Chat', 'Channels for your team with live messages and recent history',
    'https://builtins.namespaces.mixt.mpl/team-chat',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);
