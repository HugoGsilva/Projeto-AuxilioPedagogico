import { Button } from "@auxilio-pedagogico/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@auxilio-pedagogico/ui/components/sheet";
import { Link } from "@tanstack/react-router";
import {
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
  Menu,
  UsersRound,
  Waypoints,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import type { Permission, Role } from "@/lib/access";
import { useRole } from "@/lib/access";
import { authClient } from "@/lib/auth-client";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
};

type NavGroup = { label: string; items: readonly NavItem[] };

/** Navegação agrupada. Itens sem `permission` aparecem para todos os papéis. */
const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: "Acompanhamento",
    items: [
      { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
      {
        to: "/students",
        label: "Alunos",
        icon: GraduationCap,
        permission: "viewCaseStudy",
      },
      {
        to: "/case-studies",
        label: "Estudos de caso",
        icon: FileText,
        permission: "viewCaseStudy",
      },
    ],
  },
  {
    label: "Gestão",
    items: [
      {
        to: "/assignments",
        label: "Atribuições",
        icon: Waypoints,
        permission: "manageAssignments",
      },
      {
        to: "/questions",
        label: "Perguntas",
        icon: ClipboardList,
        permission: "configureQuestions",
      },
      {
        to: "/users",
        label: "Usuários",
        icon: UsersRound,
        permission: "manageUsers",
      },
    ],
  },
];

const ROLE_LABELS: Record<Role, string> = {
  director: "Direção",
  it_admin: "TI",
  pedagogue: "Pedagoga",
  teacher: "Professora",
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)![0] ?? "") : "";
  return (first + last).toUpperCase();
}

const navLinkClass =
  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-rail-text transition-colors hover:bg-rail-2 hover:text-white data-[status=active]:bg-primary data-[status=active]:text-primary-foreground data-[status=active]:hover:bg-primary";

function SidebarNav({
  groups,
  onNavigate,
}: {
  groups: NavGroup[];
  onNavigate?: () => void;
}) {
  const { role } = useRole();
  const { data: session } = authClient.useSession();
  const name = session?.user?.name ?? "Usuário";

  return (
    <div className="flex h-full flex-col bg-rail px-3 py-4 text-rail-text">
      <Link
        to="/dashboard"
        onClick={onNavigate}
        className="mb-2 flex items-center gap-3 px-2 pb-3"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          AP
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold text-white">Auxílio</span>
          <span className="block text-xs text-rail-faint">Pedagógico</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label} className="pb-1">
            <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-rail-faint">
              {group.label}
            </p>
            {group.items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={navLinkClass}
              >
                <item.icon className="size-5 shrink-0" />
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-3 border-t border-rail-line px-2 pt-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-rail-2 text-sm font-semibold text-white">
          {initialsOf(name)}
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-medium text-white">
            {name}
          </span>
          <span className="block text-xs text-rail-faint">
            {role ? ROLE_LABELS[role] : "—"}
          </span>
        </span>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { can } = useRole();
  const [menuOpen, setMenuOpen] = useState(false);

  const groups: NavGroup[] = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter(
      (item) => !item.permission || can(item.permission),
    ),
  })).filter((group) => group.items.length > 0);

  const bottomItems = groups.flatMap((group) => group.items).slice(0, 3);

  return (
    <div className="flex h-svh bg-rail">
      <aside className="hidden w-60 shrink-0 sm:block">
        <SidebarNav groups={groups} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:hidden"
                  aria-label="Abrir navegação"
                />
              }
            >
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-rail-line bg-rail p-0">
              <SidebarNav groups={groups} onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>

          <span className="hidden text-sm text-muted-foreground sm:block">
            Auxílio Pedagógico
          </span>

          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>

        <nav className="flex shrink-0 border-t border-rail-line bg-rail sm:hidden">
          {bottomItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-rail-faint transition-colors data-[status=active]:text-white"
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-rail-faint transition-colors hover:text-white"
          >
            <Menu className="size-5" />
            Mais
          </button>
        </nav>
      </div>
    </div>
  );
}
