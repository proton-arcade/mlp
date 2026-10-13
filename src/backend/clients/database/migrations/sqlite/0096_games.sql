-- Browser app: opens the sites in the internet folder, searched by MPLmit.
-- Offline by design: outside addresses are blocked, not loaded.

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-731483b7-2e96-4112-ba41-d8342de4cc52', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzNkM2QzZCIvPjx0ZXh0IHg9IjMyIiB5PSI0NCIgZm9udC1zaXplPSIzMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPuKZnjwvdGV4dD48L3N2Zz4=', 'chess', 'Chess', 'Play chess against someone at this computer',
    'https://builtins.namespaces.mixt.mpl/chess',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-8bdde63c-f815-4cb6-8261-01f981844df4', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzhiNWEyYiIvPjx0ZXh0IHg9IjMyIiB5PSI0NCIgZm9udC1zaXplPSIzMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPuKXjzwvdGV4dD48L3N2Zz4=', 'checkers', 'Checkers', 'Play checkers at this computer',
    'https://builtins.namespaces.mixt.mpl/checkers',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-435b9323-5d51-4e81-bf4f-f8c5e82e49f5', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzJhNmNiMCIvPjx0ZXh0IHg9IjMyIiB5PSI0NCIgZm9udC1zaXplPSIzMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPjk8L3RleHQ+PC9zdmc+', 'sudoku', 'Sudoku', 'Number puzzles in three difficulties',
    'https://builtins.namespaces.mixt.mpl/sudoku',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-d9a64b9a-1706-46f4-9685-f55f545cfe38', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzFmN2E0ZCIvPjx0ZXh0IHg9IjMyIiB5PSI0NCIgZm9udC1zaXplPSIzMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPuKZoDwvdGV4dD48L3N2Zz4=', 'klondike', 'Klondike', 'Klondike solitaire, draw one',
    'https://builtins.namespaces.mixt.mpl/klondike',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-0d05b772-64fb-40ea-973a-88d7035f3cdb', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzdhM2IxMiIvPjx0ZXh0IHg9IjMyIiB5PSI0NCIgZm9udC1zaXplPSIzMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPuKagjwvdGV4dD48L3N2Zz4=', 'backgammon', 'Backgammon', 'Backgammon for two at this computer',
    'https://builtins.namespaces.mixt.mpl/backgammon',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);
