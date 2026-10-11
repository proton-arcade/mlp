-- Presentation and Terminal built-in apps. Presentation data is kept in each browser (IndexedDB).

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-9d9e55c4-01d4-47cb-ba62-1879d3f2fbcd', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iI2M3NWIxMiIvPjx0ZXh0IHg9IjMyIiB5PSI0MiIgZm9udC1zaXplPSIyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPlBSPC90ZXh0Pjwvc3ZnPg==', 'presentation', 'Presentation', 'Slides with a full-screen present mode, saved on this computer',
    'https://builtins.namespaces.mixt.mpl/presentation',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-dde853b1-552e-4c32-a1c9-25ad4fe4991f', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzI2MzIzOCIvPjx0ZXh0IHg9IjMyIiB5PSI0MiIgZm9udC1zaXplPSIyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPj5fPC90ZXh0Pjwvc3ZnPg==', 'terminal', 'Terminal', 'Built-in commands and calculator; runs in this browser tab only',
    'https://builtins.namespaces.mixt.mpl/terminal',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);
