-- PDF Editor built-in app. Files are opened from and saved to this computer; nothing is stored on the server.
INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-54c7dbed-c01c-4a02-add8-fac3a45a7f0a', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iI2I3MWMxYyIvPjx0ZXh0IHg9IjMyIiB5PSI0MiIgZm9udC1zaXplPSIyMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPlBERjwvdGV4dD48L3N2Zz4=', 'pdf-editor', 'PDF Editor', 'Open a PDF, add text, highlights and white-out boxes, and save a copy',
    'https://builtins.namespaces.mixt.mpl/pdf-editor',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);
