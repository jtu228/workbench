import Link from "next/link";
import { AlertCircle, ArrowRight, FolderKanban } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeaveBalanceSummary } from "@/components/calendar/leave-balance-summary";
import { WeekPreviewCalendar } from "@/components/calendar/week-preview-calendar";
import {
  getAllInstallments,
  getCalendarEvents,
  getLeaveSettings,
  getProjectsWithRelations,
} from "@/lib/queries";
import { buildTodoItems } from "@/lib/todos";
import { DEFAULT_LEAVE_SETTINGS, getLeaveBalances } from "@/lib/leave";
import { PROJECT_TYPE_LABELS } from "@/lib/constants";

export default async function DashboardPage() {
  const [projects, installments, events, leaveSettings] = await Promise.all([
    getProjectsWithRelations(),
    getAllInstallments(),
    getCalendarEvents(),
    getLeaveSettings(),
  ]);

  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    uninvoiced: projects.filter((p) => !p.contract_finance?.is_invoiced).length,
    unpaid: projects.filter((p) => !p.contract_finance?.is_paid).length,
    incomplete: projects.filter((p) => !p.contract_finance?.system_completed).length,
  };

  const todos = buildTodoItems(projects, installments);
  const activeProjects = projects.filter((p) => p.status === "active").slice(0, 5);
  const leaveBalances = getLeaveBalances(events, leaveSettings ?? DEFAULT_LEAVE_SETTINGS);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">仪表盘</h1>
        <p className="text-slate-500">工作概览与待办提醒</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "全部项目", value: stats.total },
          { label: "进行中", value: stats.active },
          { label: "未开票", value: stats.uninvoiced },
          { label: "未付款", value: stats.unpaid },
          { label: "未完工", value: stats.incomplete },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            待办提醒
          </CardTitle>
          <CardDescription>需要跟进的合同与项目事项</CardDescription>
        </CardHeader>
        <CardContent>
          {todos.length === 0 ? (
            <p className="text-sm text-slate-500">暂无待办，一切顺利！</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {todos.slice(0, 8).map((todo) => (
                <li key={todo.id}>
                  <Link
                    href={todo.href}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3 transition-all duration-150 hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm active:scale-[0.99]"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{todo.title}</p>
                      <p className="text-xs text-slate-500">{todo.description}</p>
                    </div>
                    <Badge
                      variant={
                        todo.priority === "high"
                          ? "danger"
                          : todo.priority === "medium"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {todo.priority === "high" ? "紧急" : todo.priority === "medium" ? "一般" : "低"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>近期日程</CardTitle>
          <CardDescription>本月日历总览（含假期余额）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LeaveBalanceSummary balances={leaveBalances} />
          <WeekPreviewCalendar events={events} />
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
          >
            查看日历 <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            进行中的项目
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeProjects.length === 0 ? (
            <p className="text-sm text-slate-500">暂无进行中的项目</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between py-3 transition-colors duration-150 hover:bg-slate-50 active:bg-slate-100"
                >
                  <div>
                    <p className="font-medium">{project.client_name}</p>
                    <p className="text-sm text-slate-500">
                      {PROJECT_TYPE_LABELS[project.project_type]}
                    </p>
                  </div>
                  <span className="text-sm text-slate-400">{project.contract_no ?? "无合同号"}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
