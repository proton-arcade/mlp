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


-- Remove the business apps (invoices, CRM, cap table, projects, time tracking,
-- shift planner, equipment, inventory, point of sale, hiring). Signatures from
-- 0100 is kept. This deletes each app and every row that points at it.

DELETE FROM `user_to_app_permissions` WHERE `app_id` IN (SELECT `id` FROM `apps` WHERE `uid` IN ('app-9b1abfa8-182c-4a18-accb-67bc762742ca', 'app-d1f1dd71-6a0b-4e9f-82ca-569777924807', 'app-e0dcd0b2-db7f-40de-8d52-e5f5b5155ef4', 'app-4d024164-48cb-4015-974b-6dbd3baa0052', 'app-60ed6c18-dc56-4254-8418-62c644e71339', 'app-c208d815-adba-4aee-9974-d0ea6c9a6fec', 'app-9588468a-1940-45af-b1ef-3dfe49e29a33', 'app-bdd3509f-8ba4-48df-8888-e49135eccbda', 'app-329a3f34-c897-49d8-a431-17b65ad02278', 'app-b914a584-1950-4a01-ac61-6045f1104fb2'));
DELETE FROM `dev_to_app_permissions` WHERE `app_id` IN (SELECT `id` FROM `apps` WHERE `uid` IN ('app-9b1abfa8-182c-4a18-accb-67bc762742ca', 'app-d1f1dd71-6a0b-4e9f-82ca-569777924807', 'app-e0dcd0b2-db7f-40de-8d52-e5f5b5155ef4', 'app-4d024164-48cb-4015-974b-6dbd3baa0052', 'app-60ed6c18-dc56-4254-8418-62c644e71339', 'app-c208d815-adba-4aee-9974-d0ea6c9a6fec', 'app-9588468a-1940-45af-b1ef-3dfe49e29a33', 'app-bdd3509f-8ba4-48df-8888-e49135eccbda', 'app-329a3f34-c897-49d8-a431-17b65ad02278', 'app-b914a584-1950-4a01-ac61-6045f1104fb2'));
DELETE FROM `app_filetype_association` WHERE `app_id` IN (SELECT `id` FROM `apps` WHERE `uid` IN ('app-9b1abfa8-182c-4a18-accb-67bc762742ca', 'app-d1f1dd71-6a0b-4e9f-82ca-569777924807', 'app-e0dcd0b2-db7f-40de-8d52-e5f5b5155ef4', 'app-4d024164-48cb-4015-974b-6dbd3baa0052', 'app-60ed6c18-dc56-4254-8418-62c644e71339', 'app-c208d815-adba-4aee-9974-d0ea6c9a6fec', 'app-9588468a-1940-45af-b1ef-3dfe49e29a33', 'app-bdd3509f-8ba4-48df-8888-e49135eccbda', 'app-329a3f34-c897-49d8-a431-17b65ad02278', 'app-b914a584-1950-4a01-ac61-6045f1104fb2'));
DELETE FROM `apps` WHERE `uid` IN ('app-9b1abfa8-182c-4a18-accb-67bc762742ca', 'app-d1f1dd71-6a0b-4e9f-82ca-569777924807', 'app-e0dcd0b2-db7f-40de-8d52-e5f5b5155ef4', 'app-4d024164-48cb-4015-974b-6dbd3baa0052', 'app-60ed6c18-dc56-4254-8418-62c644e71339', 'app-c208d815-adba-4aee-9974-d0ea6c9a6fec', 'app-9588468a-1940-45af-b1ef-3dfe49e29a33', 'app-bdd3509f-8ba4-48df-8888-e49135eccbda', 'app-329a3f34-c897-49d8-a431-17b65ad02278', 'app-b914a584-1950-4a01-ac61-6045f1104fb2');
