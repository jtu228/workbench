"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteProject,
  updateCertificationProgress,
  updateContractFinance,
  updateProject,
  updateTrainingProgress,
} from "@/lib/actions";
import type {
  CertificationProgress,
  ContractFinance,
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
}: {
  projectId: string;
  projectType: ProjectType;
  finance: ContractFinance | null | undefined;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [local, setLocal] = useState(finance);

  function saveFinance(updates: Partial<ContractFinance>) {
    if (!local) return;
    const next = { ...local, ...updates };
    setLocal(next);
    startTransition(async () => {
      await updateContractFinance(projectId, updates);
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
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <NumberField
              label="分几期"
              value={local.installment_periods}
              step="1"
              onSave={(v) => saveFinance({ installment_periods: v })}
            />
            <NumberField
              label="每期金额"
              value={local.installment_amount_each}
              onSave={(v) => saveFinance({ installment_amount_each: v })}
            />
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
}: {
  projectId: string;
  progress: CertificationProgress | null | undefined;
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
        <div className="space-y-2 pl-4">
          <Label>审核日期</Label>
          <Input
            type="date"
            defaultValue={local.audit_date ?? ""}
            onBlur={(e) => save({ audit_date: e.target.value || null })}
          />
        </div>
      )}
      <label className="flex items-center gap-2 rounded-lg border p-3">
        <Checkbox
          checked={local.teacher_invoice_processed}
          onCheckedChange={(c) => save({ teacher_invoice_processed: c === true })}
        />
        <span>老师发票报销已处理</span>
      </label>
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
  const [isPending, startTransition] = useTransition();
  const [projectType, setProjectType] = useState<ProjectType>(project.project_type);

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
      formData.set("notes", project.notes ?? "");
      await updateProject(project.id, formData);
      await ensureProgressForType(nextType);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("确定删除此项目？此操作不可恢复。")) return;
    startTransition(async () => {
      await deleteProject(project.id);
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
        <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
          删除项目
        </Button>
      </div>

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
              </select>
            </div>
            <div className="space-y-2">
              <Label>合同号</Label>
              <Input name="contract_no" defaultValue={project.contract_no ?? ""} />
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
      />

      <Tabs defaultValue="finance">
        <TabsList>
          <TabsTrigger value="finance">财务状态</TabsTrigger>
          <TabsTrigger value="progress">进度</TabsTrigger>
        </TabsList>
        <TabsContent value="finance">
          <FinanceTab
            key={`${project.id}-finance-${project.contract_finance?.updated_at ?? "new"}`}
            projectId={project.id}
            finance={project.contract_finance}
          />
        </TabsContent>
        <TabsContent value="progress">
          {projectType === "certification" ? (
            <CertificationTab
              projectId={project.id}
              progress={project.certification_progress}
            />
          ) : projectType === "training" ? (
            <TrainingTab projectId={project.id} progress={project.training_progress} />
          ) : (
            <p className="text-slate-500">此项目类型暂无专用进度模板</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
