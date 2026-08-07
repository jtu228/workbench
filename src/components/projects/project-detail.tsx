"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteInstallment,
  deleteProject,
  updateCertificationProgress,
  updateContractFinance,
  updateProject,
  updateTrainingProgress,
  upsertInstallment,
} from "@/lib/actions";
import type {
  CertificationProgress,
  ContractFinance,
  InstallmentPayment,
  ProjectWithRelations,
  TrainingProgress,
} from "@/lib/types/database";

function FinanceTab({
  projectId,
  finance,
  installments,
}: {
  projectId: string;
  finance: ContractFinance | null | undefined;
  installments: InstallmentPayment[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>合同金额</Label>
          <Input
            type="number"
            defaultValue={local.contract_amount ?? ""}
            onBlur={(e) =>
              saveFinance({ contract_amount: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { key: "is_invoiced", label: "已开票" },
          { key: "is_paid", label: "已付款" },
          { key: "has_subcontract", label: "涉及分成分包" },
          { key: "system_completed", label: "系统已完工" },
          { key: "has_travel_expense", label: "含交通差旅费" },
          { key: "is_installment", label: "分期付款" },
        ].map((item) => (
          <label key={item.key} className="flex items-center gap-2 rounded-lg border p-3">
            <Checkbox
              checked={local[item.key as keyof ContractFinance] as boolean}
              onCheckedChange={(checked) =>
                saveFinance({ [item.key]: checked === true })
              }
            />
            <span className="text-sm">{item.label}</span>
          </label>
        ))}
      </div>

      {local.has_subcontract && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">分包付款</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={local.subcontract_paid}
                onCheckedChange={(checked) =>
                  saveFinance({ subcontract_paid: checked === true })
                }
              />
              <span className="text-sm">分包已付款</span>
            </label>
          </CardContent>
        </Card>
      )}

      {local.is_installment && (
        <InstallmentTable
          projectId={projectId}
          installments={installments}
          disabled={isPending}
        />
      )}
    </div>
  );
}

function InstallmentTable({
  projectId,
  installments,
  disabled,
}: {
  projectId: string;
  installments: InstallmentPayment[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function addRow() {
    startTransition(async () => {
      await upsertInstallment(projectId, {
        period_number: installments.length + 1,
        amount: 0,
        due_date: null,
        is_paid: false,
        paid_date: null,
      });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">分期付款</CardTitle>
        <Button size="sm" onClick={addRow} disabled={disabled || isPending}>
          添加期数
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {installments.map((inst) => (
          <div key={inst.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-5">
            <Input
              type="number"
              defaultValue={inst.period_number}
              onBlur={(e) =>
                startTransition(async () => {
                  await upsertInstallment(projectId, {
                    ...inst,
                    period_number: Number(e.target.value),
                  });
                  router.refresh();
                })
              }
            />
            <Input
              type="number"
              placeholder="金额"
              defaultValue={inst.amount}
              onBlur={(e) =>
                startTransition(async () => {
                  await upsertInstallment(projectId, {
                    ...inst,
                    amount: Number(e.target.value),
                  });
                  router.refresh();
                })
              }
            />
            <Input
              type="date"
              defaultValue={inst.due_date ?? ""}
              onBlur={(e) =>
                startTransition(async () => {
                  await upsertInstallment(projectId, {
                    ...inst,
                    due_date: e.target.value || null,
                  });
                  router.refresh();
                })
              }
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={inst.is_paid}
                onCheckedChange={(checked) =>
                  startTransition(async () => {
                    await upsertInstallment(projectId, {
                      ...inst,
                      is_paid: checked === true,
                    });
                    router.refresh();
                  })
                }
              />
              已付
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                startTransition(async () => {
                  await deleteInstallment(inst.id, projectId);
                  router.refresh();
                })
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
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
    { key: "survey_arranged", label: "已安排老师调研" },
    { key: "standard_training_arranged", label: "标准宣贯/内审员培训已安排" },
    { key: "coaching_arranged", label: "已安排辅导" },
    { key: "system_docs_completed", label: "体系文件已完成" },
  ] as const;

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
          <p className="text-slate-500">
            合同号 {project.contract_no ?? "无"}
          </p>
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
              <select
                name="project_type"
                defaultValue={project.project_type}
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

      <Tabs defaultValue="finance">
        <TabsList>
          <TabsTrigger value="finance">财务</TabsTrigger>
          <TabsTrigger value="progress">进度</TabsTrigger>
        </TabsList>
        <TabsContent value="finance">
          <FinanceTab
            projectId={project.id}
            finance={project.contract_finance}
            installments={project.installment_payments ?? []}
          />
        </TabsContent>
        <TabsContent value="progress">
          {project.project_type === "certification" ? (
            <CertificationTab
              projectId={project.id}
              progress={project.certification_progress}
            />
          ) : project.project_type === "training" ? (
            <TrainingTab projectId={project.id} progress={project.training_progress} />
          ) : (
            <p className="text-slate-500">此项目类型暂无专用进度模板</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
