import { Button } from "@auxilio-pedagogico/ui/components/button";
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
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

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
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">Atribuições</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Apenas direção e pedagogas gerenciam atribuições aluno↔professora.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Atribuições</h1>
        <p className="text-sm text-muted-foreground">
          Vincule professoras aos alunos. O acesso da professora é filtrado no
          servidor.
        </p>
      </div>

      <section className="space-y-4 rounded-lg border border-border bg-card p-5">
        <h2 className="font-medium">Nova atribuição</h2>
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
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Lista</h2>
        <QueryState
          query={assignmentsQuery}
          isEmpty={(rows) => rows.length === 0}
          empty={
            <p className="text-sm text-muted-foreground">
              Nenhuma atribuição cadastrada.
            </p>
          }
        >
          {(assignments) => (
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
          )}
        </QueryState>
      </section>
    </div>
  );
}
