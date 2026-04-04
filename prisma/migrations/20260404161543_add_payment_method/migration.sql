/*
  Warnings:

  - Added the required column `paymentMethod` to the `sales` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA');

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "cashReceived" DECIMAL(12,2),
ADD COLUMN     "changeGiven" DECIMAL(12,2),
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL;
