"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateContractNumberSettings } from "@/lib/actions";
import type { ContractNumberSeq } from "@/lib/types/database";

export function SettingsView({ contractSeq }: { contractSeq: ContractNumberSeq | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-slate-500">合同号规则与云端配置</p>
      </div>

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
          <CardTitle>云端数据</CardTitle>
          <CardDescription>网页端数据安全存储在 Supabase 云端</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>项目、合同、日历和备忘录实时保存到云端数据库。</p>
          <p>合同与认证资料保存在私有云存储中，仅登录账户可以访问。</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>环境配置</CardTitle>
          <CardDescription>复制 .env.local.example 为 .env.local 并填入 Supabase 密钥</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          <ul className="list-inside list-disc space-y-1">
            <li>NEXT_PUBLIC_SUPABASE_URL</li>
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
