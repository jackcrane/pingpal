-- AlterTable
ALTER TABLE `Failure` ADD COLUMN `collectBody` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `collectHeaders` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `body` LONGTEXT NULL;
