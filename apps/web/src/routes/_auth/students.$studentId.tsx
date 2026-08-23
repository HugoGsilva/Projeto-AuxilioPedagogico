import { Button } from "@auxilio-pedagogico/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@auxilio-pedagogico/ui/components/empty";
import { Skeleton } from "@auxilio-pedagogico/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/students/$studentId")({
  component: StudentCaseStudiesPage,
});

function formatDateTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("pt-BR");
}

function StudentCaseStudiesPage() {
  const { studentId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = role === "director" || role === "pedagogue" || role === "teacher";

  const studentQuery = useQuery({
    ...trpc.student.byId.queryOptions({ id: studentId }),
    enabled: Boolean(session?.user?.id),
  });

  const caseStudiesQuery = useQuery({
    ...trpc.caseStudy.listByStudent.queryOptions({ studentId }),
    enabled: Boolean(session?.user?.id),
  });

  const createMutation = useMutation(
    trpc.caseStudy.create.mutationOptions({
      onSuccess: async (created) => {
        toast.success("Estudo de caso criado");
        await queryClient.invalidateQueries(
          trpc.caseStudy.listByStudent.queryFilter({ studentId }),
        );
        await navigate({
          to: "/case-studies/$caseStudyId",
          params: { caseStudyId: created.id },
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const isLoading = studentQuery.isLoading || caseStudiesQuery.isLoading;
  const errorMessage =
    studentQuery.error?.message ?? caseStudiesQuery.error?.message;

  return (
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-6">
      <div className="space-y-2">
        <Link
          to="/students"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Voltar para alunos
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Estudos de caso
        </h1>
        <p className="text-sm text-muted-foreground">
          {studentQuery.data
            ? `${studentQuery.data.name}${
                studentQuery.data.className
                  ? ` · ${studentQuery.data.className}`
                  : ""
              }`
            : "Acompanhe os estudos de caso deste aluno."}
        </p>
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}

      {canEdit && !errorMessage ? (
        <Button
          type="button"
          disabled={createMutation.isPending || isLoading}
          onClick={() => createMutation.mutate({ studentId })}
        >
          Novo estudo de caso
        </Button>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-medium">Lista</h2>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        ) : caseStudiesQuery.isError ? null : caseStudiesQuery.data?.length ===
          0 ? (
          <Empty className="border border-border">
            <EmptyHeader>
              <EmptyTitle>Nenhum estudo de caso</EmptyTitle>
              <EmptyDescription>
                Crie o primeiro estudo de caso deste aluno para começar o
                preenchimento.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Criado em</th>
                  <th className="px-3 py-2 font-medium">Atualizado em</th>
                  <th className="px-3 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {caseStudiesQuery.data?.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-3 py-2">{formatDateTime(row.createdAt)}</td>
                    <td className="px-3 py-2">{formatDateTime(row.updatedAt)}</td>
                    <td className="px-3 py-2">
                      <Link
                        to="/case-studies/$caseStudyId"
                        params={{ caseStudyId: row.id }}
                        className="inline-flex h-7 items-center rounded-none border border-border bg-background px-2.5 text-xs hover:bg-muted"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
