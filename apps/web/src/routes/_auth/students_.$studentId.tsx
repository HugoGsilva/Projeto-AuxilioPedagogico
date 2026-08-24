import {
  Button,
  buttonVariants,
} from "@auxilio-pedagogico/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@auxilio-pedagogico/ui/components/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@auxilio-pedagogico/ui/components/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  Page,
  PageBackIcon,
  pageBackClass,
  PageHeader,
  SectionLabel,
} from "@/components/page";
import { QueryState } from "@/components/query-state";
import { Can } from "@/lib/access";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/students_/$studentId")({
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
  // Erro da lista é responsabilidade do QueryState abaixo; aqui só o do aluno.
  const errorMessage = studentQuery.error?.message;

  return (
    <Page>
      <PageHeader
        back={
          <Link to="/students" className={pageBackClass}>
            <PageBackIcon />
            Voltar para alunos
          </Link>
        }
        title="Estudos de caso"
        description={
          studentQuery.data
            ? `${studentQuery.data.name}${
                studentQuery.data.className
                  ? ` · ${studentQuery.data.className}`
                  : ""
              }`
            : "Acompanhe os estudos de caso deste aluno."
        }
        actions={
          !errorMessage ? (
            <Can permission="editCaseStudy">
              <Button
                type="button"
                disabled={createMutation.isPending || isLoading}
                onClick={() => createMutation.mutate({ studentId })}
              >
                <Plus />
                Novo estudo de caso
              </Button>
            </Can>
          ) : null
        }
      />

      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}

      <section className="space-y-3">
        <SectionLabel>Lista</SectionLabel>
        <QueryState
          query={caseStudiesQuery}
          isEmpty={(rows) => rows.length === 0}
          empty={
            <Empty className="border border-border bg-card">
              <EmptyHeader>
                <EmptyTitle>Nenhum estudo de caso</EmptyTitle>
                <EmptyDescription>
                  Crie o primeiro estudo de caso deste aluno para começar o
                  preenchimento.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          }
        >
          {(caseStudies) => (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Atualizado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caseStudies.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                    <TableCell>{formatDateTime(row.updatedAt)}</TableCell>
                    <TableCell>
                      <Link
                        to="/case-studies/$caseStudyId"
                        params={{ caseStudyId: row.id }}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        Abrir
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </QueryState>
      </section>
    </Page>
  );
}
