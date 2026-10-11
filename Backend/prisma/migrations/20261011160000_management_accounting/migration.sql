-- CreateTable
CREATE TABLE "management_periods" (
    "year" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "management_periods_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "management_transactions" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "basis" TEXT NOT NULL DEFAULT 'actual',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "source_key" TEXT,
    "title" TEXT NOT NULL,
    "counterparty" TEXT,
    "date" DATE NOT NULL,
    "due_date" DATE,
    "amount" DECIMAL(14,2) NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "cost_type_id" TEXT,
    "center_id" TEXT,
    "note" TEXT,
    "project_id" UUID,
    "file_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "management_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "management_payments" (
    "id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,

    CONSTRAINT "management_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "management_assets" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "acquired_at" DATE NOT NULL,
    "purchase_cost" DECIMAL(14,2) NOT NULL,
    "residual_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "useful_life_years" DECIMAL(6,2) NOT NULL,
    "center_id" TEXT,
    "note" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "management_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "management_loans" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "principal" DECIMAL(14,2) NOT NULL,
    "interest_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "management_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "management_repayments" (
    "id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "management_repayments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "management_transactions_source_key_key" ON "management_transactions"("source_key");

-- CreateIndex
CREATE INDEX "management_transactions_date_basis_idx" ON "management_transactions"("date", "basis");

-- CreateIndex
CREATE INDEX "management_transactions_file_id_idx" ON "management_transactions"("file_id");

-- CreateIndex
CREATE INDEX "management_transactions_project_id_idx" ON "management_transactions"("project_id");

-- CreateIndex
CREATE INDEX "management_payments_transaction_id_idx" ON "management_payments"("transaction_id");

-- CreateIndex
CREATE INDEX "management_repayments_loan_id_idx" ON "management_repayments"("loan_id");

-- AddForeignKey
ALTER TABLE "management_transactions" ADD CONSTRAINT "management_transactions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "management_transactions" ADD CONSTRAINT "management_transactions_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "management_payments" ADD CONSTRAINT "management_payments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "management_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "management_repayments" ADD CONSTRAINT "management_repayments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "management_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

