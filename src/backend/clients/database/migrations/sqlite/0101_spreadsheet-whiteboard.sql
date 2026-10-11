-- Spreadsheet and Whiteboard built-in apps. Their data is kept in each browser (IndexedDB).

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-c0f76f60-d147-46bc-9137-aaa88b9c9237', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzJlN2QzMiIvPjx0ZXh0IHg9IjMyIiB5PSI0MiIgZm9udC1zaXplPSIyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPlNTPC90ZXh0Pjwvc3ZnPg==', 'spreadsheet', 'Spreadsheet', 'Formulas, cells and CSV export, saved on this computer',
    'https://builtins.namespaces.mixt.mpl/spreadsheet',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-20c17bee-262d-472c-b037-3c0726703386', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iI2MyMTg1YiIvPjx0ZXh0IHg9IjMyIiB5PSI0MiIgZm9udC1zaXplPSIyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPldCPC90ZXh0Pjwvc3ZnPg==', 'whiteboard', 'Whiteboard', 'Sketch with pen, shapes and text, saved on this computer',
    'https://builtins.namespaces.mixt.mpl/whiteboard',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);
