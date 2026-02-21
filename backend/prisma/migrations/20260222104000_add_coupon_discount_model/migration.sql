DO $$ BEGIN
  CREATE TYPE "CouponType" AS ENUM ('PERCENT', 'FIXED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE "Coupon" (
  "id" SERIAL NOT NULL,
  "businessId" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "type" "CouponType" NOT NULL,
  "value" INTEGER NOT NULL,
  "usageLimit" INTEGER,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "minOrderAmountCents" INTEGER,
  "maxDiscountCents" INTEGER,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order"
ADD COLUMN "discountAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "couponCode" TEXT;

CREATE UNIQUE INDEX "Coupon_businessId_code_key" ON "Coupon"("businessId", "code");
CREATE INDEX "Coupon_businessId_isActive_idx" ON "Coupon"("businessId", "isActive");

ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
