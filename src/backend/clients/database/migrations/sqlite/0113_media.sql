-- Copyright (C) 2024-present Puter Technologies Inc.
--
-- This file is part of Puter.
--
-- Puter is free software: you can redistribute it and/or modify
-- it under the terms of the GNU Affero General Public License as published
-- by the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU Affero General Public License for more details.
--
-- You should have received a copy of the GNU Affero General Public License
-- along with this program.  If not, see <https://www.gnu.org/licenses/>.


-- Combine Music and Video Player into one Media app that plays local files.
-- Removes the two old apps and every row that points at them, then adds Media.

DELETE FROM `user_to_app_permissions` WHERE `app_id` IN (SELECT `id` FROM `apps` WHERE `uid` IN ('app-5c3a9328-0562-49f7-9c24-9c953ff0eff9', 'app-4a5b28d8-d923-4f4d-8f23-860a79aadab1'));
DELETE FROM `dev_to_app_permissions` WHERE `app_id` IN (SELECT `id` FROM `apps` WHERE `uid` IN ('app-5c3a9328-0562-49f7-9c24-9c953ff0eff9', 'app-4a5b28d8-d923-4f4d-8f23-860a79aadab1'));
DELETE FROM `app_filetype_association` WHERE `app_id` IN (SELECT `id` FROM `apps` WHERE `uid` IN ('app-5c3a9328-0562-49f7-9c24-9c953ff0eff9', 'app-4a5b28d8-d923-4f4d-8f23-860a79aadab1'));
DELETE FROM `apps` WHERE `uid` IN ('app-5c3a9328-0562-49f7-9c24-9c953ff0eff9', 'app-4a5b28d8-d923-4f4d-8f23-860a79aadab1');

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-45f1f306-d143-43c7-b471-fccfd5bc338d', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzE0MTYxYSIvPjxyZWN0IHg9IjgiIHk9IjE0IiB3aWR0aD0iNDgiIGhlaWdodD0iMzAiIHJ4PSIzIiBmaWxsPSIjMmMzMTNhIi8+PHBhdGggZD0iTTI3IDIydjE0bDEyLTd6IiBmaWxsPSIjZjA4YzAwIi8+PHJlY3QgeD0iMTQiIHk9IjQ4IiB3aWR0aD0iMzYiIGhlaWdodD0iNCIgcng9IjIiIGZpbGw9IiNmMDhjMDAiIG9wYWNpdHk9Ii42Ii8+PC9zdmc+', 'media', 'Media', 'Play MP3 music and MP4 video from files on this computer',
    'https://builtins.namespaces.mixt.mpl/media',
    1, 1, 0, '2026-10-13 00:00:00', NULL, 0
);
