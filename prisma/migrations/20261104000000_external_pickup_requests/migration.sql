-- CreateEnum
CREATE TYPE "PickupRequestStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExternalIdentityType" AS ENUM ('RUT', 'PASSPORT');

-- AlterTable
ALTER TABLE "document" ADD COLUMN "predecessor_document_id" UUID;

-- CreateTable
CREATE TABLE "pickup_request" (
    "id" UUID NOT NULL,
    "guardian_id" UUID NOT NULL,
    "guardian_document_id" UUID NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "summary_snapshot" JSONB NOT NULL,
    "session_id" UUID NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PickupRequestStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "rejection_reason" VARCHAR(1000),
    CONSTRAINT "pickup_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_person" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "document_type" "ExternalIdentityType" NOT NULL,
    "document_number" VARCHAR(30) NOT NULL,
    "relationship" VARCHAR(80) NOT NULL,
    "document_id" UUID NOT NULL,
    CONSTRAINT "external_person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_item" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "pickup_date" DATE NOT NULL,
    CONSTRAINT "pickup_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_active_slot" (
    "student_id" UUID NOT NULL,
    "pickup_date" DATE NOT NULL,
    "item_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    CONSTRAINT "pickup_active_slot_pkey" PRIMARY KEY ("student_id", "pickup_date")
);

-- CreateIndex
CREATE UNIQUE INDEX "pickup_request_guardian_document_id_key" ON "pickup_request"("guardian_document_id");
CREATE INDEX "pickup_request_guardian_id_submitted_at_id_idx" ON "pickup_request"("guardian_id", "submitted_at", "id");
CREATE INDEX "pickup_request_status_submitted_at_id_idx" ON "pickup_request"("status", "submitted_at", "id");
CREATE UNIQUE INDEX "pickup_request_guardian_id_idempotency_key_key" ON "pickup_request"("guardian_id", "idempotency_key");
CREATE UNIQUE INDEX "external_person_request_id_key" ON "external_person"("request_id");
CREATE UNIQUE INDEX "external_person_document_id_key" ON "external_person"("document_id");
CREATE INDEX "external_person_document_type_document_number_idx" ON "external_person"("document_type", "document_number");
CREATE INDEX "pickup_item_pickup_date_request_id_idx" ON "pickup_item"("pickup_date", "request_id");
CREATE INDEX "pickup_item_student_id_pickup_date_idx" ON "pickup_item"("student_id", "pickup_date");
CREATE UNIQUE INDEX "pickup_item_request_id_student_id_pickup_date_key" ON "pickup_item"("request_id", "student_id", "pickup_date");
CREATE UNIQUE INDEX "pickup_item_id_request_id_student_id_pickup_date_key" ON "pickup_item"("id", "request_id", "student_id", "pickup_date");
CREATE UNIQUE INDEX "pickup_active_slot_item_id_key" ON "pickup_active_slot"("item_id");
CREATE INDEX "pickup_active_slot_request_id_idx" ON "pickup_active_slot"("request_id");
CREATE UNIQUE INDEX "pickup_active_slot_item_id_request_id_student_id_pickup_dat_key" ON "pickup_active_slot"("item_id", "request_id", "student_id", "pickup_date");
CREATE UNIQUE INDEX "document_predecessor_document_id_key" ON "document"("predecessor_document_id");

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_predecessor_document_id_fkey" FOREIGN KEY ("predecessor_document_id") REFERENCES "document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pickup_request" ADD CONSTRAINT "pickup_request_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pickup_request" ADD CONSTRAINT "pickup_request_guardian_document_id_fkey" FOREIGN KEY ("guardian_document_id") REFERENCES "document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pickup_request" ADD CONSTRAINT "pickup_request_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pickup_request" ADD CONSTRAINT "pickup_request_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "external_person" ADD CONSTRAINT "external_person_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "pickup_request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "external_person" ADD CONSTRAINT "external_person_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pickup_item" ADD CONSTRAINT "pickup_item_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "pickup_request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pickup_item" ADD CONSTRAINT "pickup_item_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pickup_active_slot" ADD CONSTRAINT "pickup_active_slot_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pickup_active_slot" ADD CONSTRAINT "pickup_active_slot_item_id_request_id_student_id_pickup_da_fkey" FOREIGN KEY ("item_id", "request_id", "student_id", "pickup_date") REFERENCES "pickup_item"("id", "request_id", "student_id", "pickup_date") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pickup_active_slot" ADD CONSTRAINT "pickup_active_slot_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "pickup_request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
