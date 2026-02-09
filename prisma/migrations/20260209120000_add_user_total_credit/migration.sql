-- AlterTable: add totalCredit to User (default 100 for all existing and new users)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totalCredit" INTEGER NOT NULL DEFAULT 100;
