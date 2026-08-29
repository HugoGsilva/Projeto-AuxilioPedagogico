import { buttonVariants } from "@auxilio-pedagogico/ui/components/button";
import { Callout } from "@auxilio-pedagogico/ui/components/callout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@auxilio-pedagogico/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { FileText, Info } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Page, PageHeader } from "@/components/page";
import { QueryState } from "@/components/query-state";
import { useRole } from "@/lib/access";
import { authClient } from "@/lib/auth-client";
import { formatDateTime } from "@/lib/format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/case-studies")({
  component: CaseStudiesPage,
});

function CaseStudiesPage() {
  const { data: session } = authClient.useSession();
  const { role } = useRole();
  const isTeacher = role === "teacher";

  const listQuery = useQuery({
    ...trpc.caseStudy.list.queryOptions(),
    enabled: Boolean(session?.user?.id),
  });

  return (
    <Page>
      <PageHeader
        title="Estudos de caso"
        description="Acompanhe o preenchimento dos estudos de caso dos alunos."
      />

      {isTeacher ? (
        <Callout>
          <Info />
          <span>Mostrando apenas estudos de alunos atribuídos a você.</span>
        </Callout>
      ) : null}

      <QueryState
        query={listQuery}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            icon={FileText}
            title="Ainda não há estudos de caso"
            description="Os estudos de caso são criados a partir da lista de alunos."
            action={
              <Link to="/students" className={buttonVariants()}>
                Ir para Alunos
              </Link>
            }
          />
        }
      >
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Criado por</TableHead>
                <TableHead>Atualizado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.studentName}
                  </TableCell>
                  <TableCell>{row.className ?? "—"}</TableCell>
                  <TableCell>{row.createdByName}</TableCell>
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
    </Page>
  );
}
