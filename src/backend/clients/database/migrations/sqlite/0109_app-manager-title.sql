-- The App Store is shown as "App Manager". The internal name stays `app-center`
-- so existing links, permissions and the taskbar entry keep working.
UPDATE `apps`
   SET `title` = 'App Manager',
       `description` = 'Browse, search, open and uninstall apps'
 WHERE `name` = 'app-center';
