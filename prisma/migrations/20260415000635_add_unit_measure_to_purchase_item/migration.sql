/*
  Warnings:

  - Added the required column `unitMeasure` to the `purchase_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_userId_fkey";

-- AlterTable
ALTER TABLE "purchase_items" ADD COLUMN     "unitMeasure" "UnitMeasure" NOT NULL;

-- AlterTable
ALTER TABLE "purchases" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
