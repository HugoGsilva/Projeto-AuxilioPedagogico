import { Skeleton } from "@auxilio-pedagogico/ui/components/skeleton";
import { cn } from "@auxilio-pedagogico/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  ClipboardList,
  GraduationCap,
  type LucideIcon,
  UsersRound,
  Waypoints,
} from "lucide-react";
import type { ReactNode } from "react";

import { Page, PageHeader, SectionLabel } from "@/components/page";
import type { Permission } from "@/lib/access";
import { useRole } from "@/lib/access";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardPage,
});

type Stat = {
  label: string;
  value: ReactNode;
  hint: string;
  to: string;
  icon: LucideIcon;
};

/**
 * Cartão de indicador. O número é o elemento dominante; o rótulo vem acima em
 * texto pequeno e a ação, abaixo, com seta — o cartão inteiro é o link.
 */
function StatCard({ label, value, hint, to, icon: Icon }: Stat) {
  return (
    <Link
      to={to}
      className="group flex flex-col justify-between gap-6 rounded-lg border border-border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="text-3xl font-semibold tabular-nums tracking-tight">
            {value}
          </div>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
        {hint}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

/** Atalho de navegação — preenche o espaço morto abaixo dos indicadores. */
function ShortcutCard({
  label,
  description,
  to,
  icon: Icon,
}: {
  label: string;
  description: string;
  to: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-xs transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
        <Icon className="size-4.5" />
      </span>
      <span className="min-w-0 space-y-0.5">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-sm text-muted-foreground text-pretty">
          {description}
        </span>
      </span>
    </Link>
  );
}

type Shortcut = {
  label: string;
  description: string;
  to: string;
  icon: LucideIcon;
  permission: Permission;
};

const SHORTCUTS: readonly Shortcut[] = [
  {
    label: "Atribuições",
    description: "Defina quais professoras acompanham cada aluno.",
    to: "/assignments",
    icon: Waypoints,
    permission: "manageAssignments",
  },
  {
    label: "Perguntas",
    description: "Ajuste enunciados, seções e a ordem do estudo de caso.",
    to: "/questions",
    icon: ClipboardList,
    permission: "configureQuestions",
  },
  {
    label: "Usuários",
    description: "Crie contas e defina o perfil de acesso de cada uma.",
    to: "/users",
    icon: UsersRound,
    permission: "manageUsers",
  },
];

function DashboardPage() {
  const { session } = Route.useRouteContext();
  const { can } = useRole();
  const { data: liveSession } = authClient.useSession();
  const userId = session.data?.user?.id;

  const canViewStudents = can("viewCaseStudy");
  const canManageUsers = can("manageUsers");
  const canConfigureQuestions = can("configureQuestions");

  const studentsQuery = useQuery({
    ...trpc.student.list.queryOptions(),
    enabled: Boolean(userId) && canViewStudents,
  });
  /* Contagem de perguntas ativas por dois caminhos, porque as rotas pedem
   * permissões diferentes: `listActive` exige `viewCaseStudy` e `list` exige
   * `configureQuestions`. O it_admin tem só a segunda — chamar `listActive`
   * para todo mundo devolvia 403 e, via `QueryCache.onError`, virava o toast
   * "Permissão negada: viewCaseStudy" a cada refetch. */
  const activeQuestionsQuery = useQuery({
    ...trpc.question.listActive.queryOptions(),
    enabled: Boolean(userId) && canViewStudents,
  });
  const allQuestionsQuery = useQuery({
    ...trpc.question.list.queryOptions(),
    enabled: Boolean(userId) && !canViewStudents && canConfigureQuestions,
  });
  const usersQuery = useQuery({
    ...trpc.user.list.queryOptions(),
    enabled: Boolean(userId) && canManageUsers,
  });

  const activeStudents = studentsQuery.data?.filter((s) => s.active).length;

  const questionsQuery = canViewStudents
    ? activeQuestionsQuery
    : allQuestionsQuery;
  const activeQuestions = canViewStudents
    ? activeQuestionsQuery.data?.length
    : allQuestionsQuery.data?.filter((q) => q.active).length;
  const canSeeQuestionCount = canViewStudents || canConfigureQuestions;
  const shortcuts = SHORTCUTS.filter((item) => can(item.permission));

  const firstName = (
    liveSession?.user?.name ??
    session.data?.user?.name ??
    "usuário"
  ).split(/\s+/)[0];

  const stats: (Stat | false)[] = [
    canViewStudents && {
      label: "Alunos ativos",
      value: studentsQuery.isPending ? (
        <Skeleton className="h-9 w-12" />
      ) : (
        (activeStudents ?? "—")
      ),
      hint: "Ver alunos",
      to: "/students",
      icon: GraduationCap,
    },
    canSeeQuestionCount && {
      label: "Perguntas ativas",
      value: questionsQuery.isPending ? (
        <Skeleton className="h-9 w-12" />
      ) : (
        (activeQuestions ?? "—")
      ),
      hint: "Configurar",
      to: "/questions",
      icon: ClipboardList,
    },
    canManageUsers && {
      label: "Usuários",
      value: usersQuery.isPending ? (
        <Skeleton className="h-9 w-12" />
      ) : (
        (usersQuery.data?.length ?? "—")
      ),
      hint: "Gerenciar contas",
      to: "/users",
      icon: UsersRound,
    },
  ];
  const visibleStats = stats.filter((stat): stat is Stat => stat !== false);

  return (
    <Page>
      <PageHeader
        title={`Olá, ${firstName}`}
        description="Resumo do acompanhamento pedagógico."
      />

      <div
        className={cn(
          "grid gap-4",
          visibleStats.length >= 3
            ? "sm:grid-cols-2 lg:grid-cols-3"
            : "sm:grid-cols-2",
        )}
      >
        {visibleStats.map((stat) => (
          <StatCard key={stat.to} {...stat} />
        ))}
      </div>

      {shortcuts.length > 0 ? (
        <div className="space-y-3 pt-2">
          <SectionLabel>Atalhos</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shortcuts.map((item) => (
              <ShortcutCard key={item.to} {...item} />
            ))}
          </div>
        </div>
      ) : null}
    </Page>
  );
}
