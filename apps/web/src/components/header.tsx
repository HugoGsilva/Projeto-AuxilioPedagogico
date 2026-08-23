import { Button } from "@auxilio-pedagogico/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@auxilio-pedagogico/ui/components/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { MenuIcon } from "lucide-react";

import type { Permission } from "@/lib/access";
import { useRole } from "@/lib/access";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

type NavLink = {
  to: string;
  label: string;
  /** Quando definido, o link só aparece para papéis com esta permissão. */
  permission?: Permission;
};

const NAV_LINKS: readonly NavLink[] = [
  { to: "/", label: "Início" },
  { to: "/dashboard", label: "Painel" },
  { to: "/students", label: "Alunos", permission: "viewCaseStudy" },
  { to: "/assignments", label: "Atribuições", permission: "manageAssignments" },
  { to: "/questions", label: "Perguntas", permission: "configureQuestions" },
  { to: "/users", label: "Usuários", permission: "manageUsers" },
];

export default function Header() {
  const { can } = useRole();
  const links = NAV_LINKS.filter(
    (link) => !link.permission || can(link.permission),
  );

  return (
    <header className="border-b border-border">
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
        {/* Desktop */}
        <nav className="hidden items-center gap-1 sm:flex">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="rounded-md px-3 py-2 text-base text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[status=active]:font-medium data-[status=active]:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Mobile */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="icon" className="sm:hidden" />}
            aria-label="Abrir navegação"
          >
            <MenuIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {links.map(({ to, label }) => (
              <DropdownMenuItem key={to} render={<Link to={to} />}>
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
