export type ProjectType =
  | "certification"
  | "training"
  | "technical_service"
  | "custom";
export type ProjectStatus = "active" | "completed" | "archived" | "on_hold";
export type EventType =
  | "client_visit"
  | "leave"
  | "audit"
  | "other";
export type LeaveKind = "sick" | "annual" | "only_child";
export type DocType =
  | "cert_contract"
  | "training_agreement"
  | "tech_service_agreement"
  | "cert_form"
  | "template"
  | "other";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  client_name: string;
  project_type: ProjectType;
  status: ProjectStatus;
  contract_no: string | null;
  business_source: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ContractFinance {
  id: string;
  project_id: string;
  is_invoiced: boolean;
  is_paid: boolean;
  has_subcontract: boolean;
  subcontract_paid: boolean;
  system_completed: boolean;
  has_travel_expense: boolean;
  is_installment: boolean;
  contract_amount: number | null;
  initial_cert_fee: number | null;
  surveillance_1_fee: number | null;
  surveillance_2_fee: number | null;
  training_fee: number | null;
  technical_service_fee: number | null;
  service_man_days: number | null;
  has_revenue_share: boolean;
  revenue_share_partner: string;
  revenue_share_amount: number | null;
  revenue_share_paid: boolean;
  subcontract_partner: string;
  subcontract_amount: number | null;
  installment_periods: number | null;
  installment_amount_each: number | null;
  created_at: string;
  updated_at: string;
}

export interface InstallmentPayment {
  id: string;
  project_id: string;
  period_number: number;
  amount: number;
  due_date: string | null;
  is_paid: boolean;
  paid_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificationProgress {
  id: string;
  project_id: string;
  audit_scheduled: boolean;
  audit_date: string | null;
  stage_1_date: string | null;
  stage_2_date: string | null;
  teacher_invoice_provided: boolean;
  teacher_invoice_processed: boolean;
  feedback_submitted: boolean;
  feedback_processed: boolean;
  certificate_issued: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingProgress {
  id: string;
  project_id: string;
  survey_arranged: boolean;
  standard_training_arranged: boolean;
  coaching_arranged: boolean;
  system_docs_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  start_date: string;
  end_date: string;
  event_type: EventType;
  leave_kind: LeaveKind | null;
  project_id: string | null;
  province: string;
  city: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface UserLeaveSettings {
  user_id: string;
  annual_leave_days: number;
  only_child_leave_days: number;
  sick_leave_days_per_month: number;
  created_at: string;
  updated_at: string;
}

export interface Memo {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  is_pinned: boolean;
  project_id: string | null;
  event_date: string | null;
  province: string;
  city: string;
  add_to_calendar: boolean;
  calendar_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentSource =
  | "upload"
  | "google_drive"
  | "nutstore"
  | "local_folder"
  | "other_link";

export interface Document {
  id: string;
  user_id: string;
  project_id: string | null;
  doc_type: DocType;
  file_name: string;
  storage_path: string | null;
  external_url: string | null;
  source: DocumentSource;
  provider_file_id: string | null;
  file_size: number | null;
  mime_type: string | null;
  local_cache_path: string | null;
  created_at: string;
  updated_at: string;
}

export type CloudProvider = "google_drive" | "nutstore" | "local_folder";

export interface UserCloudAccount {
  id: string;
  user_id: string;
  provider: CloudProvider;
  account_email: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ContractNumberSeq {
  id: string;
  user_id: string;
  prefix: string;
  year: number;
  last_number: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithRelations extends Project {
  contract_finance?: ContractFinance | null;
  certification_progress?: CertificationProgress | null;
  training_progress?: TrainingProgress | null;
  installment_payments?: InstallmentPayment[];
}

export interface TodoItem {
  id: string;
  title: string;
  description: string;
  href: string;
  priority: "high" | "medium" | "low";
}
