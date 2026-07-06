-- ============================================================
-- AjoFlow — 005: Allow 'manual' payment method
--
-- manuallyRecordContribution() (src/features/payments/reconciliation.ts)
-- inserts payment_method: 'manual' for admin-recorded contributions used
-- as a fallback when Nomba's webhook doesn't fire. The original CHECK
-- constraint only allowed ('card', 'transfer') and would reject this.
-- ============================================================

ALTER TABLE contributions DROP CONSTRAINT IF EXISTS contributions_payment_method_check;

ALTER TABLE contributions
  ADD CONSTRAINT contributions_payment_method_check
  CHECK (payment_method IN ('card', 'transfer', 'manual'));
