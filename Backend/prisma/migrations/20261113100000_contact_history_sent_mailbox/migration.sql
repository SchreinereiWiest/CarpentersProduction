ALTER TABLE "contact_history_configurations"
  ADD COLUMN "sent_mailbox" TEXT,
  ADD COLUMN "sent_uid_validity" TEXT,
  ADD COLUMN "last_sent_uid" INTEGER NOT NULL DEFAULT 0;
