import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ProjectWithRelations } from "@/lib/types/database";

function normalizeProject(raw: Record<string, unknown>): ProjectWithRelations {
  const contractFinance = Array.isArray(raw.contract_finance)
    ? raw.contract_finance[0]
    : raw.contract_finance;
  const certificationProgress = Array.isArray(raw.certification_progress)
    ? raw.certification_progress[0]
    : raw.certification_progress;
  const trainingProgress = Array.isArray(raw.training_progress)
    ? raw.training_progress[0]
    : raw.training_progress;
  const installmentPayments = Array.isArray(raw.installment_payments)
    ? raw.installment_payments
    : raw.installment_payments
      ? [raw.installment_payments]
      : [];

  return {
    ...(raw as unknown as ProjectWithRelations),
    contract_finance: contractFinance ?? null,
    certification_progress: certificationProgress ?? null,
    training_progress: trainingProgress ?? null,
    installment_payments: installmentPayments,
  };
}

export const getProjectsWithRelations = cache(async (): Promise<ProjectWithRelations[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      *,
      contract_finance(*),
      certification_progress(*),
      training_progress(*),
      installment_payments(*)
    `
    )
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => normalizeProject(row as Record<string, unknown>));
});

export const getProjectById = cache(async (id: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      *,
      contract_finance(*),
      certification_progress(*),
      training_progress(*),
      installment_payments(*)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return normalizeProject(data as Record<string, unknown>);
});

export const getAllInstallments = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("installment_payments").select("*");
  if (error) throw error;
  return data ?? [];
});

export const getCalendarEvents = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .order("start_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
});

export const getMemos = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memos")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const getDocuments = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*, projects(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const getGoogleDriveAccount = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("user_cloud_accounts")
    .select("id, provider, account_email, token_expires_at, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("provider", "google_drive")
    .maybeSingle();
  if (error) throw error;
  return data;
});

export const getNutstoreAccount = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("user_cloud_accounts")
    .select("id, provider, account_email, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("provider", "nutstore")
    .maybeSingle();
  if (error) throw error;
  return data;
});

export const getLocalFolderAccount = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("user_cloud_accounts")
    .select("id, provider, account_email, metadata, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("provider", "local_folder")
    .maybeSingle();
  if (error) throw error;
  return data;
});

export const getContractNumberSettings = cache(async () => {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const { data } = await supabase
    .from("contract_number_seq")
    .select("*")
    .eq("year", year)
    .maybeSingle();
  return data;
});

export const getLeaveSettings = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_leave_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return data;
});

export const getProjectOptions = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
});
