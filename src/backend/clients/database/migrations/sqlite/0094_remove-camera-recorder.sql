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


-- Remove the Camera and Recorder apps. They were removed on purpose, so this
-- migration deletes them and every row that points at them.

DELETE FROM `user_to_app_permissions` WHERE `app_id` IN (SELECT `id` FROM `apps` WHERE `uid` IN ('app-5584fbf7-ed69-41fc-99cd-85da21b1ef51', 'app-7bdca1a4-6373-4c98-ad97-03ff2d608ca1'));
DELETE FROM `dev_to_app_permissions` WHERE `app_id` IN (SELECT `id` FROM `apps` WHERE `uid` IN ('app-5584fbf7-ed69-41fc-99cd-85da21b1ef51', 'app-7bdca1a4-6373-4c98-ad97-03ff2d608ca1'));
DELETE FROM `app_filetype_association` WHERE `app_id` IN (SELECT `id` FROM `apps` WHERE `uid` IN ('app-5584fbf7-ed69-41fc-99cd-85da21b1ef51', 'app-7bdca1a4-6373-4c98-ad97-03ff2d608ca1'));
DELETE FROM `apps` WHERE `uid` IN ('app-5584fbf7-ed69-41fc-99cd-85da21b1ef51', 'app-7bdca1a4-6373-4c98-ad97-03ff2d608ca1');
