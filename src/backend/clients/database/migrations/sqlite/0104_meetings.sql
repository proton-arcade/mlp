-- Meetings built-in app. Signalling runs through the Mixt socket relay; audio and video go directly between browsers.
INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-9b2f6a1e-3d4c-4e8a-b7f2-6c1d0e5a8b93', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzAwNzk2YiIvPjxyZWN0IHg9IjEyIiB5PSIxOCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjIyIiByeD0iNCIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik00NCAyNGwxMC02djIwbC0xMC02eiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==', 'meetings', 'Meetings', 'Video calls with up to eight people, screen sharing and chat',
    'https://builtins.namespaces.mixt.mpl/meetings',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);
