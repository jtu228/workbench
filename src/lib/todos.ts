import type {
  CalendarEvent,
  InstallmentPayment,
  ProjectWithRelations,
  TodoItem,
} from "@/lib/types/database";

export function buildTodoItems(
  projects: ProjectWithRelations[],
  installments: InstallmentPayment[]
): TodoItem[] {
  const todos: TodoItem[] = [];

  for (const project of projects) {
    const finance = project.contract_finance;
    if (finance) {
      if (!finance.is_invoiced) {
        todos.push({
          id: `${project.id}-invoice`,
          title: `${project.client_name}：未开票`,
          description: `客户 ${project.client_name}`,
          href: `/projects/${project.id}`,
          priority: "medium",
        });
      }
      if (!finance.is_paid) {
        todos.push({
          id: `${project.id}-paid`,
          title: `${project.client_name}：未付款`,
          description: `客户 ${project.client_name}`,
          href: `/projects/${project.id}`,
          priority: "high",
        });
      }
      if (finance.has_revenue_share && !finance.revenue_share_paid) {
        todos.push({
          id: `${project.id}-revenue-share`,
          title: `${project.client_name}：分成未付款`,
          description: finance.revenue_share_partner
            ? `分成方 ${finance.revenue_share_partner}`
            : "涉及分成，需跟进付款",
          href: `/projects/${project.id}`,
          priority: "high",
        });
      }
      if (finance.has_subcontract && !finance.subcontract_paid) {
        todos.push({
          id: `${project.id}-subcontract`,
          title: `${project.client_name}：分包未付款`,
          description: finance.subcontract_partner
            ? `分包方 ${finance.subcontract_partner}`
            : "涉及分包，需跟进付款",
          href: `/projects/${project.id}`,
          priority: "high",
        });
      }
      if (!finance.system_completed) {
        todos.push({
          id: `${project.id}-system`,
          title: `${project.client_name}：系统未完工`,
          description: "请确认系统完工状态",
          href: `/projects/${project.id}`,
          priority: "medium",
        });
      }
    }

    if (project.project_type === "certification" && project.certification_progress) {
      const cp = project.certification_progress;
      if (cp.audit_scheduled && cp.audit_date && !cp.teacher_invoice_processed) {
        todos.push({
          id: `${project.id}-teacher-invoice`,
          title: `${project.client_name}：老师发票未报销`,
          description: `审核日期 ${cp.audit_date}`,
          href: `/projects/${project.id}`,
          priority: "high",
        });
      }
      if (cp.feedback_submitted && !cp.feedback_processed) {
        todos.push({
          id: `${project.id}-feedback`,
          title: `${project.client_name}：审核反馈未处理`,
          description: "资料已提交，需处理反馈",
          href: `/projects/${project.id}`,
          priority: "high",
        });
      }
      if (cp.audit_scheduled && !cp.certificate_issued) {
        todos.push({
          id: `${project.id}-cert`,
          title: `${project.client_name}：未发证`,
          description: "审核已完成或进行中，关注发证状态",
          href: `/projects/${project.id}`,
          priority: "medium",
        });
      }
    }

    if (project.project_type === "training" && project.training_progress) {
      const tp = project.training_progress;
      if (!tp.system_docs_completed) {
        todos.push({
          id: `${project.id}-docs`,
          title: `${project.client_name}：体系文件未完成`,
          description: "培训项目需完成体系文件",
          href: `/projects/${project.id}`,
          priority: "medium",
        });
      }
    }
  }

  const today = new Date();
  const weekLater = new Date();
  weekLater.setDate(today.getDate() + 7);

  for (const inst of installments) {
    if (!inst.is_paid && inst.due_date) {
      const due = new Date(inst.due_date);
      if (due <= weekLater) {
        const project = projects.find((p) => p.id === inst.project_id);
        todos.push({
          id: `inst-${inst.id}`,
          title: `${project?.client_name ?? "项目"}：第${inst.period_number}期付款即将到期`,
          description: `应付日期 ${inst.due_date}`,
          href: `/projects/${inst.project_id}`,
          priority: due < today ? "high" : "medium",
        });
      }
    }
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return todos.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

export function filterProjects(
  projects: ProjectWithRelations[],
  filters: {
    type?: string;
    status?: string;
    finance?: string;
    search?: string;
  }
) {
  return projects.filter((project) => {
    if (filters.type && filters.type !== "all" && project.project_type !== filters.type) {
      return false;
    }
    if (filters.status && filters.status !== "all" && project.status !== filters.status) {
      return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = `${project.client_name} ${project.contract_no ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    const finance = project.contract_finance;
    if (filters.finance === "uninvoiced" && finance?.is_invoiced) return false;
    if (filters.finance === "unpaid" && finance?.is_paid) return false;
    if (filters.finance === "incomplete" && finance?.system_completed) return false;
    return true;
  });
}

export function upcomingEvents(events: CalendarEvent[], days = 14) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + days);

  return events
    .filter((e) => {
      const start = new Date(e.start_date);
      return start >= today && start <= end;
    })
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}
