-- Expand contract finance pricing and split revenue share / subcontract
alter table public.contract_finance
  add column if not exists initial_cert_fee numeric(12, 2),
  add column if not exists surveillance_1_fee numeric(12, 2),
  add column if not exists surveillance_2_fee numeric(12, 2),
  add column if not exists training_fee numeric(12, 2),
  add column if not exists technical_service_fee numeric(12, 2),
  add column if not exists service_man_days numeric(8, 2),
  add column if not exists has_revenue_share boolean not null default false,
  add column if not exists revenue_share_partner text not null default '',
  add column if not exists revenue_share_amount numeric(12, 2),
  add column if not exists revenue_share_paid boolean not null default false,
  add column if not exists subcontract_partner text not null default '',
  add column if not exists subcontract_amount numeric(12, 2);
