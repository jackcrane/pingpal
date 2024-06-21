-- AlterTable
ALTER TABLE `Failure` MODIFY `status` INTEGER NULL,
    MODIFY `headers` VARCHAR(191) NULL,
    MODIFY `latency` INTEGER NULL,
    MODIFY `reason` ENUM('STATUS_CODE', 'REQUEST_FAILURE', 'EXPECTED_TEXT', 'LATENCY', 'NO_RESPONSE') NOT NULL;