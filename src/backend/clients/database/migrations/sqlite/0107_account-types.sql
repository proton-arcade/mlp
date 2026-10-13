-- Account types: owner, administrator, developer, standard, guest.
-- The original `admin` account is the owner; every existing account except
-- admin becomes a standard user. New guest accounts are created as `guest`.
ALTER TABLE `user` ADD COLUMN `account_type` VARCHAR(16) NOT NULL DEFAULT 'standard';
UPDATE `user` SET `account_type` = 'owner' WHERE `username` = 'admin';
