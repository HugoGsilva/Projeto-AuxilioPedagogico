import {
  Button,
  buttonVariants,
} from "@auxilio-pedagogico/ui/components/button";
import { Field, FieldLabel } from "@auxilio-pedagogico/ui/components/field";
import { Select } from "@auxilio-pedagogico/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@auxilio-pedagogico/ui/components/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Waypoints } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { Page, PageHeader, Section, SectionLabel } from "@/components/page";
import { QueryState } from "@/components/query-state";
import { useRole } from "@/lib/access";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/assignments")({
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const canManage = useRole().can("manageAssignments");

  const assignmentsQuery = useQuery({
    ...trpc.studentAssignment.list.queryOptions(),
    enabled: Boolean(session?.user?.id) && canManage,
  });
  const studentsQuery = useQuery({
    ...trpc.student.list.queryOptions(),
    enabled: Boolean(session?.user?.id) && canManage,
  });
  const teachersQuery = useQuery({
    ...trpc.studentAssignment.teachers.queryOptions(),
    enabled: Boolean(session?.user?.id) && canManage,
  });

  /* O vínculo depende de existir aluno E professora. Sem isso, o formulário
   * acima fica com dois selects vazios e mandar "vincule no formulário" seria
   * enganoso — o vazio precisa apontar o que falta de verdade. */
  const hasStudents = (studentsQuery.data?.length ?? 0) > 0;
  const hasTeachers = (teachersQuery.data?.length ?? 0) > 0;
  const missingPrerequisite = !hasStudents || !hasTeachers;

  const [studentId, setStudentId] = useState("");
  const [teacherId, setTeacherId] = useState("");

  const createMutation = useMutation(
    trpc.studentAssignment.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Atribuição criada");
        setStudentId("");
        setTeacherId("");
        await queryClient.invalidateQueries(
          trpc.studentAssignment.list.queryFilter(),
        );
        await queryClient.invalidateQueries(trpc.student.list.queryFilter());
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const removeMutation = useMutation(
    trpc.studentAssignment.remove.mutationOptions({
      onSuccess: async () => {
        toast.success("Atribuição removida");
        await queryClient.invalidateQueries(
          trpc.studentAssignment.list.queryFilter(),
        );
        await queryClient.invalidateQueries(trpc.student.list.queryFilter());
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (!canManage) {
    return (
      <Page>
        <PageHeader
          title="Atribuições"
          description="Apenas direção e pedagogas gerenciam atribuições aluno↔professora."
        />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Atribuições"
        description="Vincule professoras aos alunos. O acesso da professora é filtrado no servidor."
      />

      <Section title="Nova atribuição">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!studentId || !teacherId) return;
            createMutation.mutate({ studentId, teacherId });
          }}
        >
          <Field>
            <FieldLabel htmlFor="assign-student" required>
              Aluno
            </FieldLabel>
            <Select
              id="assign-student"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            >
              <option value="">Selecione…</option>
              {studentsQuery.data
                ?.filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.className ? ` (${s.className})` : ""}
                  </option>
                ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="assign-teacher" required>
              Professora
            </FieldLabel>
            <Select
              id="assign-teacher"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              required
            >
              <option value="">Selecione…</option>
              {teachersQuery.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.email}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Salvando…" : "Atribuir"}
            </Button>
          </div>
        </form>
      </Section>

      <section className="space-y-3">
        <SectionLabel>Lista</SectionLabel>
        <QueryState
          query={assignmentsQuery}
          isEmpty={(rows) => rows.length === 0}
          empty={
            <EmptyState
              icon={Waypoints}
              title="Ainda não há atribuições"
              description={
                hasStudents && hasTeachers
                  ? "Vincule uma professora a um aluno no formulário acima. Sem vínculo, a professora não enxerga nenhum aluno."
                  : !hasStudents && !hasTeachers
                    ? "Antes de vincular, cadastre pelo menos um aluno e uma conta com perfil de professora."
                    : !hasStudents
                      ? "Cadastre pelo menos um aluno antes de vincular uma professora."
                      : "Crie uma conta com perfil de professora antes de vincular um aluno."
              }
              action={
                missingPrerequisite ? (
                  <Link
                    to={!hasStudents ? "/students" : "/users"}
                    className={buttonVariants()}
                  >
                    {!hasStudents ? "Cadastrar alunos" : "Criar conta"}
                  </Link>
                ) : null
              }
            />
          }
        >
          {(assignments) => (
            <>
              {/* Tabela só a partir de lg */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Professora</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.studentName}</TableCell>
                        <TableCell>
                          {a.teacherName}
                          <span className="text-muted-foreground">
                            {" "}
                            ({a.teacherEmail})
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={removeMutation.isPending}
                            onClick={() => removeMutation.mutate({ id: a.id })}
                          >
                            Remover
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: cards — na tabela a ação "Remover" saía da tela. */}
              <ul className="space-y-3 lg:hidden">
                {assignments.map((a) => (
                  <li
                    key={a.id}
                    className="space-y-3 rounded-lg border border-border bg-card p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{a.studentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {a.teacherName}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {a.teacherEmail}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={removeMutation.isPending}
                      onClick={() => removeMutation.mutate({ id: a.id })}
                    >
                      Remover
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </QueryState>
      </section>
    </Page>
  );
}
