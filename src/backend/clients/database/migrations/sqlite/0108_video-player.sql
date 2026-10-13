-- Video Player built-in app: plays MP4 video and MP3 audio from files on this computer.
-- Only MP4 and MP3 are supported.

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-4a5b28d8-d923-4f4d-8f23-860a79aadab1', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzE0MTYxYSIvPjxyZWN0IHg9IjgiIHk9IjE0IiB3aWR0aD0iNDgiIGhlaWdodD0iMzAiIHJ4PSIzIiBmaWxsPSIjMmMzMTNhIi8+PHBhdGggZD0iTTI3IDIydjE0bDEyLTd6IiBmaWxsPSIjZjA4YzAwIi8+PHJlY3QgeD0iMTQiIHk9IjQ4IiB3aWR0aD0iMzYiIGhlaWdodD0iNCIgcng9IjIiIGZpbGw9IiNmMDhjMDAiIG9wYWNpdHk9Ii42Ii8+PC9zdmc+', 'video-player', 'Video Player', 'Play MP4 video and MP3 audio',
    'https://builtins.namespaces.mixt.mpl/video-player',
    1, 1, 0, '2026-10-12 00:00:00', NULL, 0
);
