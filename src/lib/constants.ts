import type { DocType, EventType, ProjectStatus, ProjectType } from "./types/database";

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  certification: "认证项目",
  training: "培训项目",
  other: "其他",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "进行中",
  completed: "已完成",
  archived: "已归档",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  client_visit: "外出",
  leave: "请假",
  audit: "审核",
  other: "其他",
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  client_visit: "#3b82f6",
  leave: "#f97316",
  audit: "#22c55e",
  other: "#6b7280",
};

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  contract: "合同",
  certification: "认证资料",
  template: "模板",
  other: "其他",
};

export const NAV_ITEMS = [
  { href: "/dashboard", label: "仪表盘", icon: "LayoutDashboard" },
  { href: "/projects", label: "项目管理", icon: "FolderKanban" },
  { href: "/calendar", label: "日历", icon: "Calendar" },
  { href: "/memos", label: "备忘录", icon: "StickyNote" },
  { href: "/documents", label: "文档中心", icon: "FileText" },
  { href: "/settings", label: "设置", icon: "Settings" },
] as const;
