"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateSelect } from "@/components/ui/date-select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  deleteProject,
  syncInstallmentPeriods,
  updateCertificationProgress,
  updateContractFinance,
  updateInstallmentAmount,
  updateProject,
  updateTrainingProgress,
} from "@/lib/actions";
import type {
  CertificationProgress,
  ContractFinance,
  InstallmentPayment,
  ProjectType,
  ProjectWithRelations,
  TrainingProgress,
} from "@/lib/types/database";
import { createClient } from "@/lib/supabase/client";

function NumberField({
  label,
  value,
  onSave,
  step = "0.01",
}: {
  label: string;
  value: number | null | undefined;
  onSave: (value: number | null) => void;
  step?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        step={step}
        defaultValue={value ?? ""}
        onBlur={(e) => onSave(e.target.value ? Number(e.target.value) : null)}
      />
    </div>
  );
}

function ContractTermsCard({
  projectId,
  projectType,
  finance,
  installments,
}: {
  projectId: string;
  projectType: ProjectType;
  finance: ContractFinance | null | undefined;
  installments: InstallmentPayment[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [local, setLocal] = useState(finance);
  const [localInstallments, setLocalInstallments] = useState(
    [...installments].sort((a, b) => a.period_number - b.period_number)
  );

  useEffect(() => {
    const periods = local?.installment_periods;
    if (!local?.is_installment || !periods || periods <= 0) return;
    if (localInstallments.length === periods) return;

    let cancelled = false;
    startTransition(async () => {
      const synced = await syncInstallmentPeriods(projectId, periods);
      if (!cancelled) {
        setLocalInstallments(synced as InstallmentPayment[]);
        router.refresh();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    local?.is_installment,
    local?.installment_periods,
    localInstallments.length,
    projectId,
    router,
  ]);

  function saveFinance(updates: Partial<ContractFinance>) {
    if (!local) return;
    const next = { ...local, ...updates };
    setLocal(next);
    startTransition(async () => {
      await updateContractFinance(projectId, updates);
      router.refresh();
    });
  }

  function savePeriods(value: number | null) {
    if (!local) return;
    const periods = value && value > 0 ? Math.floor(value) : null;
    setLocal({ ...local, installment_periods: periods });
    startTransition(async () => {
      const synced = await syncInstallmentPeriods(projectId, periods);
      setLocalInstallments(synced as InstallmentPayment[]);
      router.refresh();
    });
  }

  function saveInstallmentAmount(installmentId: string, amount: number | null) {
    const nextAmount = amount ?? 0;
    setLocalInstallments((prev) =>
      prev.map((row) => (row.id === installmentId ? { ...row, amount: nextAmount } : row))
    );
    startTransition(async () => {
      await updateInstallmentAmount(projectId, installmentId, nextAmount);
      router.refresh();
    });
  }

  if (!local) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">合同价格与条款</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {projectType === "certification" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              label="初次认证费用"
              value={local.initial_cert_fee}
              onSave={(v) => saveFinance({ initial_cert_fee: v })}
            />
            <NumberField
              label="监督一费用"
              value={local.surveillance_1_fee}
              onSave={(v) => saveFinance({ surveillance_1_fee: v })}
            />
            <NumberField
              label="监督二费用"
              value={local.surveillance_2_fee}
              onSave={(v) => saveFinance({ surveillance_2_fee: v })}
            />
          </div>
        )}

        {projectType === "training" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="培训费"
              value={local.training_fee}
              onSave={(v) => saveFinance({ training_fee: v })}
            />
            <NumberField
              label="服务人天"
              value={local.service_man_days}
              step="0.5"
              onSave={(v) => saveFinance({ service_man_days: v })}
            />
          </div>
        )}

        {projectType === "technical_service" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="技术服务费"
              value={local.technical_service_fee}
              onSave={(v) => saveFinance({ technical_service_fee: v })}
            />
            <NumberField
              label="服务人天"
              value={local.service_man_days}
              step="0.5"
              onSave={(v) => saveFinance({ service_man_days: v })}
            />
          </div>
        )}

        {projectType === "custom" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="合同金额"
              value={local.contract_amount}
              onSave={(v) => saveFinance({ contract_amount: v })}
            />
            <NumberField
              label="服务人天"
              value={local.service_man_days}
              step="0.5"
              onSave={(v) => saveFinance({ service_man_days: v })}
            />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { key: "has_travel_expense" as const, label: "含交通差旅费" },
            { key: "is_installment" as const, label: "分期付款" },
            { key: "has_revenue_share" as const, label: "涉及分成" },
            { key: "has_subcontract" as const, label: "涉及分包" },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-2 rounded-lg border p-3">
              <Checkbox
                checked={local[item.key]}
                onCheckedChange={(checked) => saveFinance({ [item.key]: checked === true })}
              />
              <span className="text-sm">{item.label}</span>
            </label>
          ))}
        </div>

        {local.has_revenue_share && (
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>分成方名称</Label>
              <Input
                defaultValue={local.revenue_share_partner ?? ""}
                placeholder="填写分成方名称"
                onBlur={(e) => saveFinance({ revenue_share_partner: e.target.value })}
              />
            </div>
            <NumberField
              label="分成金额"
              value={local.revenue_share_amount}
              onSave={(v) => saveFinance({ revenue_share_amount: v })}
            />
          </div>
        )}

        {local.has_subcontract && (
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>分包方名称</Label>
              <Input
                defaultValue={local.subcontract_partner ?? ""}
                placeholder="填写分包方名称"
                onBlur={(e) => saveFinance({ subcontract_partner: e.target.value })}
              />
            </div>
            <NumberField
              label="分包金额"
              value={local.subcontract_amount}
              onSave={(v) => saveFinance({ subcontract_amount: v })}
            />
          </div>
        )}

        {local.is_installment && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="max-w-xs">
              <NumberField
                label="分几期"
                value={local.installment_periods}
                step="1"
                onSave={savePeriods}
              />
            </div>
            {localInstallments.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {localInstallments.map((inst) => (
                  <NumberField
                    key={`${inst.id}-${inst.period_number}`}
                    label={`第${inst.period_number}期金额`}
                    value={inst.amount}
                    onSave={(v) => saveInstallmentAmount(inst.id, v)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FinanceTab({
  projectId,
  finance,
}: {
  projectId: string;
  finance: ContractFinance | null | undefined;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [local, setLocal] = useState(finance);

  function saveFinance(updates: Partial<ContractFinance>) {
    const next = { ...local!, ...updates };
    setLocal(next);
    startTransition(async () => {
      await updateContractFinance(projectId, updates);
      router.refresh();
    });
  }

  if (!local) return <p className="text-slate-500">财务信息加载中...</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { key: "is_invoiced" as const, label: "已开票" },
          { key: "is_paid" as const, label: "已付款" },
          { key: "system_completed" as const, label: "系统已完工" },
        ].map((item) => (
          <label key={item.key} className="flex items-center gap-2 rounded-lg border p-3">
            <Checkbox
              checked={local[item.key]}
              onCheckedChange={(checked) => saveFinance({ [item.key]: checked === true })}
            />
            <span className="text-sm">{item.label}</span>
          </label>
        ))}
      </div>

      {local.has_revenue_share && (
        <label className="flex items-center gap-2 rounded-lg border p-3">
          <Checkbox
            checked={local.revenue_share_paid}
            onCheckedChange={(checked) => saveFinance({ revenue_share_paid: checked === true })}
          />
          <span className="text-sm">分成已付款</span>
        </label>
      )}

      {local.has_subcontract && (
        <label className="flex items-center gap-2 rounded-lg border p-3">
          <Checkbox
            checked={local.subcontract_paid}
            onCheckedChange={(checked) => saveFinance({ subcontract_paid: checked === true })}
          />
          <span className="text-sm">分包已付款</span>
        </label>
      )}
    </div>
  );
}

function CertificationTab({
  projectId,
  progress,
  hasTravelExpense,
}: {
  projectId: string;
  progress: CertificationProgress | null | undefined;
  hasTravelExpense: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [local, setLocal] = useState(progress);

  function save(updates: Partial<CertificationProgress>) {
    const next = { ...local!, ...updates };
    setLocal(next);
    startTransition(async () => {
      await updateCertificationProgress(projectId, updates);
      router.refresh();
    });
  }

  if (!local) return <p className="text-slate-500">进度信息加载中...</p>;

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 rounded-lg border p-3">
        <Checkbox
          checked={local.audit_scheduled}
          onCheckedChange={(c) => save({ audit_scheduled: c === true })}
        />
        <span>已安排审核时间</span>
      </label>
      {local.audit_scheduled && (
        <div className="grid gap-4 pl-4 sm:grid-cols-2">
          <DateSelect
            label="一阶段时间"
            defaultValue={local.stage_1_date ?? local.audit_date ?? ""}
            onChange={(v) => save({ stage_1_date: v || null })}
          />
          <DateSelect
            label="二阶段时间"
            defaultValue={local.stage_2_date ?? ""}
            onChange={(v) => save({ stage_2_date: v || null })}
          />
        </div>
      )}
      {hasTravelExpense && (
        <>
          <label className="flex items-center gap-2 rounded-lg border p-3">
            <Checkbox
              checked={local.teacher_invoice_provided}
              onCheckedChange={(c) => save({ teacher_invoice_provided: c === true })}
            />
            <span>老师发票是否提供</span>
          </label>
          <label className="flex items-center gap-2 rounded-lg border p-3">
            <Checkbox
              checked={local.teacher_invoice_processed}
              onCheckedChange={(c) => save({ teacher_invoice_processed: c === true })}
            />
            <span>老师发票报销已处理</span>
          </label>
        </>
      )}
      <label className="flex items-center gap-2 rounded-lg border p-3">
        <Checkbox
          checked={local.feedback_submitted}
          onCheckedChange={(c) => save({ feedback_submitted: c === true })}
        />
        <span>审核资料已提交</span>
      </label>
      {local.feedback_submitted && (
        <label className="ml-4 flex items-center gap-2 rounded-lg border p-3">
          <Checkbox
            checked={local.feedback_processed}
            onCheckedChange={(c) => save({ feedback_processed: c === true })}
          />
          <span>反馈已处理</span>
        </label>
      )}
      <label className="flex items-center gap-2 rounded-lg border p-3">
        <Checkbox
          checked={local.certificate_issued}
          onCheckedChange={(c) => save({ certificate_issued: c === true })}
        />
        <span>已发证</span>
      </label>
      {isPending && <p className="text-xs text-slate-400">保存中...</p>}
    </div>
  );
}

function TrainingTab({
  projectId,
  progress,
}: {
  projectId: string;
  progress: TrainingProgress | null | undefined;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [local, setLocal] = useState(progress);

  function save(updates: Partial<TrainingProgress>) {
    const next = { ...local!, ...updates };
    setLocal(next);
    startTransition(async () => {
      await updateTrainingProgress(projectId, updates);
      router.refresh();
    });
  }

  if (!local) return <p className="text-slate-500">进度信息加载中...</p>;

  const items = [
    { key: "survey_arranged" as const, label: "已安排老师调研" },
    { key: "standard_training_arranged" as const, label: "标准宣贯/内审员培训已安排" },
    { key: "coaching_arranged" as const, label: "已安排辅导" },
    { key: "system_docs_completed" as const, label: "体系文件已完成" },
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <label key={item.key} className="flex items-center gap-2 rounded-lg border p-3">
          <Checkbox
            checked={local[item.key]}
            onCheckedChange={(c) => save({ [item.key]: c === true })}
          />
          <span>{item.label}</span>
        </label>
      ))}
      {isPending && <p className="text-xs text-slate-400">保存中...</p>}
    </div>
  );
}

export function ProjectDetail({ project }: { project: ProjectWithRelations }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [projectType, setProjectType] = useState<ProjectType>(project.project_type);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function ensureProgressForType(type: ProjectType) {
    const supabase = createClient();
    if (type === "certification" && !project.certification_progress) {
      await supabase.from("certification_progress").upsert({ project_id: project.id });
    }
    if (type === "training" && !project.training_progress) {
      await supabase.from("training_progress").upsert({ project_id: project.id });
    }
  }

  function handleTypeChange(nextType: ProjectType) {
    setProjectType(nextType);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("client_name", project.client_name);
      formData.set("project_type", nextType);
      formData.set("status", project.status);
      formData.set("contract_no", project.contract_no ?? "");
      formData.set("business_source", project.business_source ?? "");
      formData.set("notes", project.notes ?? "");
      await updateProject(project.id, formData);
      await ensureProgressForType(nextType);
      router.refresh();
      toast({ title: "项目类型已更新", variant: "success" });
    });
  }

  function handleDelete() {
    setConfirmDelete(true);
  }

  function confirmDeleteProject() {
    startTransition(async () => {
      await deleteProject(project.id);
      setConfirmDelete(false);
      toast({ title: "项目已删除", variant: "success" });
      router.push("/projects");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project.client_name}</h1>
          <p className="text-slate-500">合同号 {project.contract_no ?? "无"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              toast({ title: "返回项目列表", variant: "info" });
              router.push("/projects");
            }}
            disabled={isPending}
          >
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            删除项目
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="删除项目？"
        description="此操作不可恢复，项目相关财务与进度信息都会一并删除。"
        confirmLabel="确认删除"
        destructive
        pending={isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={confirmDeleteProject}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            action={async (formData) => {
              formData.set("project_type", projectType);
              await updateProject(project.id, formData);
              toast({ title: "基本信息已保存", variant: "success" });
              router.refresh();
            }}
          >
            <div className="space-y-2">
              <Label>客户名称</Label>
              <Input name="client_name" defaultValue={project.client_name} required />
            </div>
            <div className="space-y-2">
              <Label>项目类型</Label>
              <input type="hidden" name="project_type" value={projectType} />
              <select
                value={projectType}
                onChange={(e) => handleTypeChange(e.target.value as ProjectType)}
                className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
              >
                <option value="certification">认证</option>
                <option value="training">培训</option>
                <option value="technical_service">技术服务</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <select
                name="status"
                defaultValue={project.status}
                className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
              >
                <option value="active">进行中</option>
                <option value="completed">已完成</option>
                <option value="archived">已归档</option>
                <option value="on_hold">项目搁置</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>合同号</Label>
              <Input name="contract_no" defaultValue={project.contract_no ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>业务来源</Label>
              <Input
                name="business_source"
                defaultValue={project.business_source ?? ""}
                placeholder="例如：老客户介绍、展会、官网"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>备注</Label>
              <Input name="notes" defaultValue={project.notes} />
            </div>
            <div>
              <Button type="submit">保存基本信息</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ContractTermsCard
        key={`${project.id}-${projectType}`}
        projectId={project.id}
        projectType={projectType}
        finance={project.contract_finance}
        installments={project.installment_payments ?? []}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">财务状态</CardTitle>
        </CardHeader>
        <CardContent>
          <FinanceTab
            key={`${project.id}-finance-${project.contract_finance?.updated_at ?? "new"}`}
            projectId={project.id}
            finance={project.contract_finance}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">进度</CardTitle>
        </CardHeader>
        <CardContent>
          {projectType === "certification" ? (
            <CertificationTab
              projectId={project.id}
              progress={project.certification_progress}
              hasTravelExpense={project.contract_finance?.has_travel_expense ?? false}
            />
          ) : projectType === "training" ? (
            <TrainingTab projectId={project.id} progress={project.training_progress} />
          ) : (
            <p className="text-slate-500">此项目类型暂无专用进度模板</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
