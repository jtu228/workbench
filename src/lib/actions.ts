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
  const business_source = ((formData.get("business_source") as string) || "").trim();

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: client_name,
      client_name,
      project_type,
      notes,
      contract_no,
      business_source,
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
      business_source: ((formData.get("business_source") as string) || "").trim(),
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

export async function syncInstallmentPeriods(projectId: string, periods: number | null) {
  const supabase = await createClient();
  const count = periods && periods > 0 ? Math.floor(periods) : 0;

  const { error: financeError } = await supabase
    .from("contract_finance")
    .update({ installment_periods: count > 0 ? count : null })
    .eq("project_id", projectId);
  if (financeError) throw financeError;

  const { data: existing, error: listError } = await supabase
    .from("installment_payments")
    .select("*")
    .eq("project_id", projectId)
    .order("period_number");
  if (listError) throw listError;

  const rows = existing ?? [];
  const byPeriod = new Map(rows.map((row) => [row.period_number, row]));

  const toInsert = [];
  for (let period = 1; period <= count; period++) {
    if (!byPeriod.has(period)) {
      toInsert.push({
        project_id: projectId,
        period_number: period,
        amount: 0,
        due_date: null,
        is_paid: false,
        paid_date: null,
      });
    }
  }
  if (toInsert.length > 0) {
    const { error } = await supabase.from("installment_payments").insert(toInsert);
    if (error) throw error;
  }

  const extras = rows.filter((row) => row.period_number > count);
  if (extras.length > 0) {
    const { error } = await supabase
      .from("installment_payments")
      .delete()
      .in(
        "id",
        extras.map((row) => row.id)
      );
    if (error) throw error;
  }

  const { data: synced, error: syncedError } = await supabase
    .from("installment_payments")
    .select("*")
    .eq("project_id", projectId)
    .order("period_number");
  if (syncedError) throw syncedError;

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  return synced ?? [];
}

export async function updateInstallmentAmount(
  projectId: string,
  installmentId: string,
  amount: number
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("installment_payments")
    .update({ amount })
    .eq("id", installmentId)
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

  const eventType = formData.get("event_type") as string;
  const leaveKind =
    eventType === "leave"
      ? (((formData.get("leave_kind") as string) || "").trim() as string) || null
      : null;

  const { error } = await supabase.from("calendar_events").insert({
    user_id: user.id,
    title: formData.get("title") as string,
    start_date: formData.get("start_date") as string,
    end_date: (formData.get("end_date") as string) || (formData.get("start_date") as string),
    event_type: eventType,
    leave_kind: leaveKind,
    project_id: (formData.get("project_id") as string) || null,
    province: ((formData.get("province") as string) || "").trim(),
    city: ((formData.get("city") as string) || "").trim(),
    description: (formData.get("description") as string) || "",
  });
  if (error) throw error;
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function updateCalendarEvent(id: string, formData: FormData) {
  const supabase = await createClient();
  const eventType = formData.get("event_type") as string;
  const leaveKind =
    eventType === "leave"
      ? (((formData.get("leave_kind") as string) || "").trim() as string) || null
      : null;

  const { error } = await supabase
    .from("calendar_events")
    .update({
      title: formData.get("title") as string,
      start_date: formData.get("start_date") as string,
      end_date: (formData.get("end_date") as string) || (formData.get("start_date") as string),
      event_type: eventType,
      leave_kind: leaveKind,
      project_id: (formData.get("project_id") as string) || null,
      province: ((formData.get("province") as string) || "").trim(),
      city: ((formData.get("city") as string) || "").trim(),
      description: (formData.get("description") as string) || "",
    })
    .eq("id", id);
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

  const title = formData.get("title") as string;
  const content = (formData.get("content") as string) || "";
  const eventDate = ((formData.get("event_date") as string) || "").trim() || null;
  const province = ((formData.get("province") as string) || "").trim();
  const city = ((formData.get("city") as string) || "").trim();
  const addToCalendar = formData.get("add_to_calendar") === "on";
  const projectId = (formData.get("project_id") as string) || null;

  let calendarEventId: string | null = null;
  if (addToCalendar) {
    if (!eventDate) throw new Error("加入日历时请填写日期");
    const { data: event, error: eventError } = await supabase
      .from("calendar_events")
      .insert({
        user_id: user.id,
        title,
        start_date: eventDate,
        end_date: eventDate,
        event_type: "other",
        project_id: projectId,
        province,
        city,
        description: content,
      })
      .select("id")
      .single();
    if (eventError) throw eventError;
    calendarEventId = event.id;
  }

  const { error } = await supabase.from("memos").insert({
    user_id: user.id,
    title,
    content,
    tags,
    is_pinned: formData.get("is_pinned") === "on",
    project_id: projectId,
    event_date: eventDate,
    province,
    city,
    add_to_calendar: addToCalendar,
    calendar_event_id: calendarEventId,
  });
  if (error) throw error;
  revalidatePath("/memos");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function updateMemo(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");

  const tags = ((formData.get("tags") as string) || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const title = formData.get("title") as string;
  const content = (formData.get("content") as string) || "";
  const eventDate = ((formData.get("event_date") as string) || "").trim() || null;
  const province = ((formData.get("province") as string) || "").trim();
  const city = ((formData.get("city") as string) || "").trim();
  const addToCalendar = formData.get("add_to_calendar") === "on";
  const projectId = (formData.get("project_id") as string) || null;

  const { data: existing, error: existingError } = await supabase
    .from("memos")
    .select("calendar_event_id")
    .eq("id", id)
    .single();
  if (existingError) throw existingError;

  let calendarEventId = existing.calendar_event_id as string | null;

  if (addToCalendar) {
    if (!eventDate) throw new Error("加入日历时请填写日期");
    const payload = {
      title,
      start_date: eventDate,
      end_date: eventDate,
      event_type: "other",
      project_id: projectId,
      province,
      city,
      description: content,
    };
    if (calendarEventId) {
      const { error } = await supabase
        .from("calendar_events")
        .update(payload)
        .eq("id", calendarEventId);
      if (error) throw error;
    } else {
      const { data: event, error } = await supabase
        .from("calendar_events")
        .insert({ user_id: user.id, ...payload })
        .select("id")
        .single();
      if (error) throw error;
      calendarEventId = event.id;
    }
  } else if (calendarEventId) {
    const { error } = await supabase.from("calendar_events").delete().eq("id", calendarEventId);
    if (error) throw error;
    calendarEventId = null;
  }

  const { error } = await supabase
    .from("memos")
    .update({
      title,
      content,
      tags,
      is_pinned: formData.get("is_pinned") === "on",
      project_id: projectId,
      event_date: eventDate,
      province,
      city,
      add_to_calendar: addToCalendar,
      calendar_event_id: calendarEventId,
    })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/memos");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function deleteMemo(id: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("memos")
    .select("calendar_event_id")
    .eq("id", id)
    .single();

  if (existing?.calendar_event_id) {
    await supabase.from("calendar_events").delete().eq("id", existing.calendar_event_id);
  }

  const { error } = await supabase.from("memos").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/memos");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
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
    external_url: null,
    source: "upload",
    provider_file_id: null,
    file_size: file.size,
    mime_type: file.type,
  });
  if (error) throw error;
  revalidatePath("/documents");
}

export async function addGoogleDriveDocument(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");

  const fileId = ((formData.get("provider_file_id") as string) || "").trim();
  const fileName = ((formData.get("file_name") as string) || "").trim();
  const externalUrl = ((formData.get("external_url") as string) || "").trim();
  const mimeType = ((formData.get("mime_type") as string) || "").trim() || null;
  const fileSizeRaw = (formData.get("file_size") as string) || "";
  const fileSize = fileSizeRaw ? Number(fileSizeRaw) : null;
  const docType = (formData.get("doc_type") as string) || "other";
  const projectId = (formData.get("project_id") as string) || null;

  if (!fileId || !fileName || !externalUrl) {
    throw new Error("缺少 Google Drive 文件信息");
  }

  const { error } = await supabase.from("documents").insert({
    user_id: user.id,
    project_id: projectId,
    doc_type: docType,
    file_name: fileName,
    storage_path: null,
    external_url: externalUrl,
    source: "google_drive",
    provider_file_id: fileId,
    file_size: Number.isFinite(fileSize) ? fileSize : null,
    mime_type: mimeType,
  });
  if (error) throw error;
  revalidatePath("/documents");
}

export async function disconnectGoogleDrive() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");

  const { error } = await supabase
    .from("user_cloud_accounts")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", "google_drive");
  if (error) throw error;
  revalidatePath("/documents");
  revalidatePath("/settings");
}

export async function connectNutstore(formData: FormData) {
  const { verifyNutstoreCredentials } = await import("@/lib/cloud/nutstore");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");

  const email = ((formData.get("email") as string) || "").trim();
  const password = ((formData.get("app_password") as string) || "").trim();
  if (!email || !password) throw new Error("请填写坚果云邮箱和应用密码");

  await verifyNutstoreCredentials(email, password);

  const { data: existing } = await supabase
    .from("user_cloud_accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", "nutstore")
    .maybeSingle();

  const payload = {
    user_id: user.id,
    provider: "nutstore" as const,
    account_email: email,
    access_token: password,
    refresh_token: null,
    token_expires_at: null,
    metadata: { dav_root: "https://dav.jianguoyun.com/dav/" },
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("user_cloud_accounts")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("user_cloud_accounts").insert(payload);
    if (error) throw error;
  }

  revalidatePath("/documents");
  revalidatePath("/settings");
}

export async function disconnectNutstore() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");

  const { error } = await supabase
    .from("user_cloud_accounts")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", "nutstore");
  if (error) throw error;
  revalidatePath("/documents");
  revalidatePath("/settings");
}

export async function addNutstoreDocument(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");

  const path = ((formData.get("provider_file_id") as string) || "").trim();
  const fileName = ((formData.get("file_name") as string) || "").trim();
  const mimeType = ((formData.get("mime_type") as string) || "").trim() || null;
  const fileSizeRaw = (formData.get("file_size") as string) || "";
  const fileSize = fileSizeRaw ? Number(fileSizeRaw) : null;
  const docType = (formData.get("doc_type") as string) || "other";
  const projectId = (formData.get("project_id") as string) || null;

  if (!path || !fileName) throw new Error("缺少坚果云文件信息");

  const openUrl = `/api/cloud/nutstore/file?path=${encodeURIComponent(path)}`;

  const { error } = await supabase.from("documents").insert({
    user_id: user.id,
    project_id: projectId,
    doc_type: docType,
    file_name: fileName,
    storage_path: null,
    external_url: openUrl,
    source: "nutstore",
    provider_file_id: path,
    file_size: Number.isFinite(fileSize) ? fileSize : null,
    mime_type: mimeType,
  });
  if (error) throw error;
  revalidatePath("/documents");
}

export async function saveLocalFolderLink(folderName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");

  const name = folderName.trim() || "本机文件夹";
  const { data: existing } = await supabase
    .from("user_cloud_accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", "local_folder")
    .maybeSingle();

  const payload = {
    user_id: user.id,
    provider: "local_folder" as const,
    account_email: name,
    access_token: null,
    refresh_token: null,
    token_expires_at: null,
    metadata: {
      suggested: "G:\\",
      label: "Google Drive 本地盘",
    },
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("user_cloud_accounts")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("user_cloud_accounts").insert(payload);
    if (error) throw error;
  }

  revalidatePath("/documents");
}

export async function disconnectLocalFolderLink() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");

  const { error } = await supabase
    .from("user_cloud_accounts")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", "local_folder");
  if (error) throw error;
  revalidatePath("/documents");
}

export async function addLocalFolderDocument(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");

  const path = ((formData.get("provider_file_id") as string) || "").trim();
  const fileName = ((formData.get("file_name") as string) || "").trim();
  const mimeType = ((formData.get("mime_type") as string) || "").trim() || null;
  const fileSizeRaw = (formData.get("file_size") as string) || "";
  const fileSize = fileSizeRaw ? Number(fileSizeRaw) : null;
  const docType = (formData.get("doc_type") as string) || "other";
  const projectId = (formData.get("project_id") as string) || null;

  if (!path || !fileName) throw new Error("缺少本机文件信息");

  const { error } = await supabase.from("documents").insert({
    user_id: user.id,
    project_id: projectId,
    doc_type: docType,
    file_name: fileName,
    storage_path: null,
    external_url: null,
    source: "local_folder",
    provider_file_id: path,
    local_cache_path: path,
    file_size: Number.isFinite(fileSize) ? fileSize : null,
    mime_type: mimeType,
  });
  if (error) throw error;
  revalidatePath("/documents");
}

export async function deleteDocument(id: string, storagePath: string | null) {
  const supabase = await createClient();
  if (storagePath) {
    await supabase.storage.from("documents").remove([storagePath]);
  }
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

export async function updateLeaveSettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");

  const annual = Number(formData.get("annual_leave_days"));
  const onlyChild = Number(formData.get("only_child_leave_days"));
  const sick = Number(formData.get("sick_leave_days_per_month"));

  if (!Number.isFinite(annual) || annual < 0) throw new Error("年假天数无效");
  if (!Number.isFinite(onlyChild) || onlyChild < 0) throw new Error("独生子女假天数无效");
  if (!Number.isFinite(sick) || sick < 0) throw new Error("病假天数无效");

  const { error } = await supabase.from("user_leave_settings").upsert(
    {
      user_id: user.id,
      annual_leave_days: annual,
      only_child_leave_days: onlyChild,
      sick_leave_days_per_month: sick,
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
