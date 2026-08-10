"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProject } from "@/lib/actions";

export function CreateProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projectType, setProjectType] = useState("certification");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const id = await createProject(formData);
      setOpen(false);
      router.push(`/projects/${id}`);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "创建失败");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        新建项目
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">新建项目</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_name">客户名称</Label>
            <Input id="client_name" name="client_name" required />
          </div>
          <div className="space-y-2">
            <Label>项目类型</Label>
            <input type="hidden" name="project_type" value={projectType} />
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="certification">认证</SelectItem>
                <SelectItem value="training">培训</SelectItem>
                <SelectItem value="technical_service">技术服务</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contract_no">合同号</Label>
            <Input id="contract_no" name="contract_no" placeholder="例如：4400/QES/2026/86001" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business_source">业务来源</Label>
            <Input
              id="business_source"
              name="business_source"
              placeholder="例如：老客户介绍、展会、官网"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">备注</Label>
            <Textarea id="notes" name="notes" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "创建中..." : "创建"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
