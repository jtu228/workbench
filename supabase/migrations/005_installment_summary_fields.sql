alter table public.contract_finance
  add column if not exists installment_periods integer,
  add column if not exists installment_amount_each numeric(12, 2);
