"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from "@/lib/constants";
import { filterProjects } from "@/lib/todos";
import type { ProjectWithRelations } from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils";

export function ProjectsList({ projects }: { projects: ProjectWithRelations[] }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [finance, setFinance] = useState("all");

  const filtered = useMemo(
    () => filterProjects(projects, { search, type, status, finance }),
    [projects, search, type, status, finance]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">项目管理</h1>
          <p className="text-slate-500">合同财务与项目进度管理</p>
        </div>
        <CreateProjectDialog />
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="搜索项目、客户、合同号..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="项目类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="certification">认证</SelectItem>
            <SelectItem value="training">培训</SelectItem>
            <SelectItem value="technical_service">技术服务</SelectItem>
            <SelectItem value="custom">自定义</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">进行中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="archived">已归档</SelectItem>
          </SelectContent>
        </Select>
        <Select value={finance} onValueChange={setFinance}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="财务筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部财务</SelectItem>
            <SelectItem value="uninvoiced">未开票</SelectItem>
            <SelectItem value="unpaid">未付款</SelectItem>
            <SelectItem value="incomplete">未完工</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">客户</th>
              <th className="px-4 py-3 font-medium">类型</th>
              <th className="px-4 py-3 font-medium">合同号</th>
              <th className="px-4 py-3 font-medium">金额</th>
              <th className="px-4 py-3 font-medium">财务状态</th>
              <th className="px-4 py-3 font-medium">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  暂无项目
                </td>
              </tr>
            ) : (
              filtered.map((project) => {
                const f = project.contract_finance;
                return (
                  <tr key={project.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/projects/${project.id}`} className="font-medium text-slate-900 hover:underline">
                        {project.client_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{PROJECT_TYPE_LABELS[project.project_type]}</td>
                    <td className="px-4 py-3">{project.contract_no ?? "—"}</td>
                    <td className="px-4 py-3">{formatCurrency(f?.contract_amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={f?.is_invoiced ? "success" : "warning"}>
                          {f?.is_invoiced ? "已开票" : "未开票"}
                        </Badge>
                        <Badge variant={f?.is_paid ? "success" : "danger"}>
                          {f?.is_paid ? "已付款" : "未付款"}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{PROJECT_STATUS_LABELS[project.status]}</Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
