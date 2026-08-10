"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Loader2,
  LogOut,
  Settings,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useLinkStatus } from "next/link";

const iconMap = {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  StickyNote,
  FileText,
  Settings,
};

const navItems = [
  { href: "/dashboard", label: "仪表盘", icon: "LayoutDashboard" as const },
  { href: "/projects", label: "项目管理", icon: "FolderKanban" as const },
  { href: "/calendar", label: "日历", icon: "Calendar" as const },
  { href: "/memos", label: "备忘录", icon: "StickyNote" as const },
  { href: "/documents", label: "文档中心", icon: "FileText" as const },
  { href: "/settings", label: "设置", icon: "Settings" as const },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98]",
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
      <NavPendingIndicator />
    </Link>
  );
}

function NavPendingIndicator() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin opacity-60" />;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <h1 className="text-lg font-bold text-slate-900">个人工作台</h1>
        <p className="text-xs text-slate-500">认证 · 培训 · 技术服务 · 合同管理</p>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={Icon}
              active={active}
            />
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          退出登录
        </Button>
      </div>
    </aside>
  );
}
