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


-- Remove the Signatures app. This deletes the app and every row that points at it.

DELETE FROM `user_to_app_permissions` WHERE `app_id` IN (SELECT `id` FROM `apps` WHERE `uid` IN ('app-8bfbe7c7-555b-4829-8445-fa412417fee5'));
DELETE FROM `dev_to_app_permissions` WHERE `app_id` IN (SELECT `id` FROM `apps` WHERE `uid` IN ('app-8bfbe7c7-555b-4829-8445-fa412417fee5'));
DELETE FROM `app_filetype_association` WHERE `app_id` IN (SELECT `id` FROM `apps` WHERE `uid` IN ('app-8bfbe7c7-555b-4829-8445-fa412417fee5'));
DELETE FROM `apps` WHERE `uid` IN ('app-8bfbe7c7-555b-4829-8445-fa412417fee5');
