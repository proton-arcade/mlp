-- Notes and Calendar built-in apps. Their data is kept in each browser (IndexedDB).

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-5e59316b-32c5-40b2-b7f2-b905a24e0467', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzhiNWEyYiIvPjx0ZXh0IHg9IjMyIiB5PSI0NCIgZm9udC1zaXplPSIzMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPiYjOTk5ODs8L3RleHQ+PC9zdmc+', 'notes', 'Notes', 'Rich-text notes saved on this computer',
    'https://builtins.namespaces.mixt.mpl/notes',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-2a7c9984-d555-4703-880a-babe2b73c54e', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iI2IwM2EzYSIvPjx0ZXh0IHg9IjMyIiB5PSI0NCIgZm9udC1zaXplPSIzMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPiYjMTI4MTk3OzwvdGV4dD48L3N2Zz4=', 'calendar', 'Calendar', 'Month view with events saved on this computer',
    'https://builtins.namespaces.mixt.mpl/calendar',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);
