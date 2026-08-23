import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@auxilio-pedagogico/ui/components/card";
import { Skeleton } from "@auxilio-pedagogico/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { useRole } from "@/lib/access";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardPage,
});

function StatCard({
  label,
  value,
  hint,
  to,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  to: string;
}) {
  return (
    <Link to={to} className="block">
      <Card className="h-full transition-shadow hover:ring-foreground/25">
        <CardHeader>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
          <CardDescription>{hint}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}

function DashboardPage() {
  const { session } = Route.useRouteContext();
  const { can } = useRole();
  const userId = session.data?.user?.id;

  const canViewStudents = can("viewCaseStudy");
  const canManageUsers = can("manageUsers");

  const studentsQuery = useQuery({
    ...trpc.student.list.queryOptions(),
    enabled: Boolean(userId) && canViewStudents,
  });
  const activeQuestionsQuery = useQuery({
    ...trpc.question.listActive.queryOptions(),
    enabled: Boolean(userId),
  });
  const usersQuery = useQuery({
    ...trpc.user.list.queryOptions(),
    enabled: Boolean(userId) && canManageUsers,
  });

  const activeStudents = studentsQuery.data?.filter((s) => s.active).length;

  return (
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground">
          Bem-vindo(a), {session.data?.user?.name ?? "usuário"}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {canViewStudents ? (
          <StatCard
            label="Alunos ativos"
            value={
              studentsQuery.isPending ? (
                <Skeleton className="h-7 w-10" />
              ) : (
                (activeStudents ?? "—")
              )
            }
            hint="Ver lista de alunos"
            to="/students"
          />
        ) : null}

        <StatCard
          label="Perguntas ativas"
          value={
            activeQuestionsQuery.isPending ? (
              <Skeleton className="h-7 w-10" />
            ) : (
              (activeQuestionsQuery.data?.length ?? "—")
            )
          }
          hint="Configurar estudo de caso"
          to="/questions"
        />

        {canManageUsers ? (
          <StatCard
            label="Usuários"
            value={
              usersQuery.isPending ? (
                <Skeleton className="h-7 w-10" />
              ) : (
                (usersQuery.data?.length ?? "—")
              )
            }
            hint="Gerenciar contas"
            to="/users"
          />
        ) : null}
      </div>
    </div>
  );
}
