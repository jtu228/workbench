"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateContractNumberSettings, updateLeaveSettings } from "@/lib/actions";
import { DEFAULT_LEAVE_SETTINGS } from "@/lib/leave";
import type { ContractNumberSeq, UserLeaveSettings } from "@/lib/types/database";
import { useToast } from "@/components/ui/toast";

export function SettingsView({
  contractSeq,
  leaveSettings,
}: {
  contractSeq: ContractNumberSeq | null;
  leaveSettings: UserLeaveSettings | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const leave = leaveSettings ?? DEFAULT_LEAVE_SETTINGS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-slate-500">合同号规则、假期额度与云端配置</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>假期额度</CardTitle>
          <CardDescription>
            病假按月重置；年假与独生子女假按年累计已用天数。在日历新建「请假」时选择具体类型。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid max-w-xl gap-4 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              startTransition(async () => {
                await updateLeaveSettings(formData);
                toast({ title: "假期设置已保存", variant: "success" });
                router.refresh();
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="sick_leave_days_per_month">每月病假（天）</Label>
              <Input
                id="sick_leave_days_per_month"
                name="sick_leave_days_per_month"
                type="number"
                step="0.5"
                min="0"
                defaultValue={leave.sick_leave_days_per_month}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annual_leave_days">每年年假（天）</Label>
              <Input
                id="annual_leave_days"
                name="annual_leave_days"
                type="number"
                step="0.5"
                min="0"
                defaultValue={leave.annual_leave_days}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="only_child_leave_days">独生子女假（天）</Label>
              <Input
                id="only_child_leave_days"
                name="only_child_leave_days"
                type="number"
                step="0.5"
                min="0"
                defaultValue={leave.only_child_leave_days}
                required
              />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={isPending}>
                保存假期设置
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>合同号规则</CardTitle>
          <CardDescription>
            格式：前缀-年份-序号，例如 ZD-2026-001。当前年度已用到第{" "}
            {contractSeq?.last_number ?? 0} 号。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex max-w-sm items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              startTransition(async () => {
                await updateContractNumberSettings(formData.get("prefix") as string);
                toast({ title: "合同号规则已保存", variant: "success" });
                router.refresh();
              });
            }}
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="prefix">前缀</Label>
              <Input
                id="prefix"
                name="prefix"
                defaultValue={contractSeq?.prefix ?? "ZD"}
                required
              />
            </div>
            <Button type="submit" disabled={isPending}>
              保存
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>云端与网盘</CardTitle>
          <CardDescription>
            元数据在 Supabase；大文件走本机 Google Drive（G:\），入口在「文档中心」。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>项目、合同、日历和备忘录实时保存到云端数据库。</p>
          <p>小文件仍可上传到私有 Storage；大文件放本机 Google Drive，文档中心浏览并一键打开。</p>
          <Button asChild variant="outline" size="sm">
            <a href="/documents">打开文档中心</a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>环境配置</CardTitle>
          <CardDescription>复制 .env.local.example 为 .env.local 并填入密钥</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          <ul className="list-inside list-disc space-y-1">
            <li>NEXT_PUBLIC_SUPABASE_URL</li>
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
            <li>NEXT_PUBLIC_APP_URL</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
