"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProjectType } from "@/lib/types/database";

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");

  const client_name = (formData.get("client_name") as string)?.trim();
  if (!client_name) throw new Error("请填写客户名称");

  const project_type = formData.get("project_type") as ProjectType;
  const notes = (formData.get("notes") as string) || "";
  const contract_no = ((formData.get("contract_no") as string) || "").trim() || null;

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: client_name,
      client_name,
      project_type,
      notes,
      contract_no,
    })
    .select("id")
    .single();

  if (error) throw error;

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return project.id as string;
}

export async function updateProject(id: string, formData: FormData) {
  const supabase = await createClient();
  const client_name = (formData.get("client_name") as string)?.trim();
  if (!client_name) throw new Error("请填写客户名称");

  const { error } = await supabase
    .from("projects")
    .update({
      name: client_name,
      client_name,
      project_type: formData.get("project_type") as ProjectType,
      status: formData.get("status") as string,
      contract_no: ((formData.get("contract_no") as string) || "").trim() || null,
      notes: (formData.get("notes") as string) || "",
    })
    .eq("id", id);

  if (error) throw error;
  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/projects");
  revalidatePath("/dashboard");
}

export async function updateContractFinance(projectId: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contract_finance")
    .update(data)
    .eq("project_id", projectId);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
}

export async function upsertInstallment(
  projectId: string,
  installment: {
    id?: string;
    period_number: number;
    amount: number;
    due_date: string | null;
    is_paid: boolean;
    paid_date: string | null;
  }
) {
  const supabase = await createClient();
  if (installment.id) {
    const { error } = await supabase
      .from("installment_payments")
      .update(installment)
      .eq("id", installment.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("installment_payments").insert({
      project_id: projectId,
      ...installment,
    });
    if (error) throw error;
  }
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
}

export async function deleteInstallment(id: string, projectId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("installment_payments").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
}

export async function updateCertificationProgress(
  projectId: string,
  data: Record<string, unknown>
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("certification_progress")
    .update(data)
    .eq("project_id", projectId);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
}

export async function updateTrainingProgress(projectId: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("training_progress")
    .update(data)
    .eq("project_id", projectId);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
}

export async function createCalendarEvent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");

  const { error } = await supabase.from("calendar_events").insert({
    user_id: user.id,
    title: formData.get("title") as string,
    start_date: formData.get("start_date") as string,
    end_date: (formData.get("end_date") as string) || (formData.get("start_date") as string),
    event_type: formData.get("event_type") as string,
    project_id: (formData.get("project_id") as string) || null,
    description: (formData.get("description") as string) || "",
  });
  if (error) throw error;
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function deleteCalendarEvent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function createMemo(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");

  const tags = ((formData.get("tags") as string) || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const { error } = await supabase.from("memos").insert({
    user_id: user.id,
    title: formData.get("title") as string,
    content: (formData.get("content") as string) || "",
    tags,
    is_pinned: formData.get("is_pinned") === "on",
    project_id: (formData.get("project_id") as string) || null,
  });
  if (error) throw error;
  revalidatePath("/memos");
}

export async function updateMemo(id: string, formData: FormData) {
  const supabase = await createClient();
  const tags = ((formData.get("tags") as string) || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const { error } = await supabase
    .from("memos")
    .update({
      title: formData.get("title") as string,
      content: (formData.get("content") as string) || "",
      tags,
      is_pinned: formData.get("is_pinned") === "on",
      project_id: (formData.get("project_id") as string) || null,
    })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/memos");
}

export async function deleteMemo(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("memos").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/memos");
}

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");

  const file = formData.get("file") as File;
  if (!file || file.size === 0) throw new Error("请选择文件");

  const docType = formData.get("doc_type") as string;
  const projectId = (formData.get("project_id") as string) || null;
  const storagePath = `${user.id}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, file);
  if (uploadError) throw uploadError;

  const { error } = await supabase.from("documents").insert({
    user_id: user.id,
    project_id: projectId,
    doc_type: docType,
    file_name: file.name,
    storage_path: storagePath,
    file_size: file.size,
    mime_type: file.type,
  });
  if (error) throw error;
  revalidatePath("/documents");
}

export async function deleteDocument(id: string, storagePath: string) {
  const supabase = await createClient();
  await supabase.storage.from("documents").remove([storagePath]);
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/documents");
}

export async function updateContractNumberSettings(prefix: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");

  const year = new Date().getFullYear();
  const { error } = await supabase.from("contract_number_seq").upsert(
    {
      user_id: user.id,
      prefix,
      year,
      last_number: 0,
    },
    { onConflict: "user_id,year" }
  );
  if (error) throw error;
  revalidatePath("/settings");
}
