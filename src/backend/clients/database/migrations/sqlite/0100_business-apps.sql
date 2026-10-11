-- Business apps built in: invoices, CRM, cap table, projects, time tracking,
-- shift planner, equipment, inventory, point of sale, hiring and signatures.
-- Their data is kept in each browser (IndexedDB), as with Notes and Calendar.

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-9b1abfa8-182c-4a18-accb-67bc762742ca', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzJmNmIzYSIvPjx0ZXh0IHg9IjMyIiB5PSI0MiIgZm9udC1zaXplPSIyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPkk8L3RleHQ+PC9zdmc+', 'invoices', 'Invoices', 'Customers, invoices and payment status saved on this computer',
    'https://builtins.namespaces.mixt.mpl/invoices',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-d1f1dd71-6a0b-4e9f-82ca-569777924807', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzFmNWZhOCIvPjx0ZXh0IHg9IjMyIiB5PSI0MiIgZm9udC1zaXplPSIyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPkNSPC90ZXh0Pjwvc3ZnPg==', 'crm', 'CRM', 'Contacts and a sales pipeline saved on this computer',
    'https://builtins.namespaces.mixt.mpl/crm',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-e0dcd0b2-db7f-40de-8d52-e5f5b5155ef4', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzZiM2ZhMCIvPjx0ZXh0IHg9IjMyIiB5PSI0MiIgZm9udC1zaXplPSIyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPkNUPC90ZXh0Pjwvc3ZnPg==', 'cap-table', 'Cap Table', 'Shareholdings and a funding-round simulator saved on this computer',
    'https://builtins.namespaces.mixt.mpl/cap-table',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-4d024164-48cb-4015-974b-6dbd3baa0052', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iI2EwNTIyZCIvPjx0ZXh0IHg9IjMyIiB5PSI0MiIgZm9udC1zaXplPSIyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPlA8L3RleHQ+PC9zdmc+', 'projects', 'Projects', 'Project task board saved on this computer',
    'https://builtins.namespaces.mixt.mpl/projects',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-60ed6c18-dc56-4254-8418-62c644e71339', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzJhN2Y4NiIvPjx0ZXh0IHg9IjMyIiB5PSI0MiIgZm9udC1zaXplPSIyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPlQ8L3RleHQ+PC9zdmc+', 'time-tracking', 'Time Tracking', 'Timer, time entries and billable totals saved on this computer',
    'https://builtins.namespaces.mixt.mpl/time-tracking',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-c208d815-adba-4aee-9974-d0ea6c9a6fec', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzRmNmQxZiIvPjx0ZXh0IHg9IjMyIiB5PSI0MiIgZm9udC1zaXplPSIyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPlM8L3RleHQ+PC9zdmc+', 'shift-planner', 'Shift Planner', 'Weekly staff rota with hours saved on this computer',
    'https://builtins.namespaces.mixt.mpl/shift-planner',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-9588468a-1940-45af-b1ef-3dfe49e29a33', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzU2NjA2YiIvPjx0ZXh0IHg9IjMyIiB5PSI0MiIgZm9udC1zaXplPSIyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPkU8L3RleHQ+PC9zdmc+', 'equipment', 'Equipment', 'Asset register with service reminders saved on this computer',
    'https://builtins.namespaces.mixt.mpl/equipment',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-bdd3509f-8ba4-48df-8888-e49135eccbda', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzhhNmQxMiIvPjx0ZXh0IHg9IjMyIiB5PSI0MiIgZm9udC1zaXplPSIyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPklOPC90ZXh0Pjwvc3ZnPg==', 'inventory', 'Inventory', 'Stock levels, reorder list and movements saved on this computer',
    'https://builtins.namespaces.mixt.mpl/inventory',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-329a3f34-c897-49d8-a431-17b65ad02278', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iI2IwNDQzYSIvPjx0ZXh0IHg9IjMyIiB5PSI0MiIgZm9udC1zaXplPSIyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPlBTPC90ZXh0Pjwvc3ZnPg==', 'point-of-sale', 'Point of Sale', 'Register, products and sales saved on this computer',
    'https://builtins.namespaces.mixt.mpl/point-of-sale',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-b914a584-1950-4a01-ac61-6045f1104fb2', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzNkNWE4MCIvPjx0ZXh0IHg9IjMyIiB5PSI0MiIgZm9udC1zaXplPSIyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPkg8L3RleHQ+PC9zdmc+', 'hiring', 'Hiring', 'Candidate pipeline and open roles saved on this computer',
    'https://builtins.namespaces.mixt.mpl/hiring',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-8bfbe7c7-555b-4829-8445-fa412417fee5', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzdhM2U2ZSIvPjx0ZXh0IHg9IjMyIiB5PSI0MiIgZm9udC1zaXplPSIyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPlNHPC90ZXh0Pjwvc3ZnPg==', 'signatures', 'Signatures', 'Documents you can sign by hand and download, saved on this computer',
    'https://builtins.namespaces.mixt.mpl/signatures',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);
