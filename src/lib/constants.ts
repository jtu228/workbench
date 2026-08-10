import type {
  DocType,
  DocumentSource,
  EventType,
  LeaveKind,
  ProjectStatus,
  ProjectType,
} from "./types/database";

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  certification: "认证",
  training: "培训",
  technical_service: "技术服务",
  custom: "自定义",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "进行中",
  completed: "已完成",
  archived: "已归档",
  on_hold: "项目搁置",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  client_visit: "外出",
  leave: "请假",
  audit: "审核",
  other: "其他",
};

export const LEAVE_KIND_LABELS: Record<LeaveKind, string> = {
  sick: "病假",
  annual: "年假",
  only_child: "独生子女假",
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  client_visit: "#3b82f6",
  leave: "#f97316",
  audit: "#22c55e",
  other: "#6b7280",
};

export const LEAVE_KIND_COLORS: Record<LeaveKind, string> = {
  sick: "#ef4444",
  annual: "#f97316",
  only_child: "#a855f7",
};

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  cert_contract: "认证合同",
  training_agreement: "培训协议",
  tech_service_agreement: "技术服务协议",
  cert_form: "认证表单",
  template: "模板",
  other: "其他",
};

export const DOCUMENT_SOURCE_LABELS: Record<DocumentSource, string> = {
  upload: "本地上传",
  google_drive: "Google Drive",
  nutstore: "坚果云",
  local_folder: "本机文件夹",
  other_link: "外链",
};

export const NAV_ITEMS = [
  { href: "/dashboard", label: "仪表盘", icon: "LayoutDashboard" },
  { href: "/projects", label: "项目管理", icon: "FolderKanban" },
  { href: "/calendar", label: "日历", icon: "Calendar" },
  { href: "/memos", label: "备忘录", icon: "StickyNote" },
  { href: "/documents", label: "文档中心", icon: "FileText" },
  { href: "/settings", label: "设置", icon: "Settings" },
] as const;
