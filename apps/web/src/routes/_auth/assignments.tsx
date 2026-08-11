import { Button } from "@auxilio-pedagogico/ui/components/button";
import { Label } from "@auxilio-pedagogico/ui/components/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/assignments")({
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canManage = role === "director" || role === "pedagogue";

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
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">Atribuições</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Apenas direção e pedagogas gerenciam atribuições aluno↔professora.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-8 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Atribuições</h1>
        <p className="text-sm text-muted-foreground">
          Vincule professoras aos alunos. O acesso da professora é filtrado no
          servidor.
        </p>
      </div>

      <section className="space-y-4 border border-border p-4">
        <h2 className="font-medium">Nova atribuição</h2>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!studentId || !teacherId) return;
            createMutation.mutate({ studentId, teacherId });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="assign-student">Aluno</Label>
            <select
              id="assign-student"
              className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs"
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
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assign-teacher">Professora</Label>
            <select
              id="assign-teacher"
              className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs"
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
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Salvando…" : "Atribuir"}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Lista</h2>
        {assignmentsQuery.isLoading || assignmentsQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : assignmentsQuery.isError ? (
          <p className="text-sm text-destructive">
            {assignmentsQuery.error.message}
          </p>
        ) : assignmentsQuery.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma atribuição cadastrada.
          </p>
        ) : (
          <div className="overflow-x-auto border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Aluno</th>
                  <th className="px-3 py-2 font-medium">Professora</th>
                  <th className="px-3 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {assignmentsQuery.data?.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-3 py-2">{a.studentName}</td>
                    <td className="px-3 py-2">
                      {a.teacherName}
                      <span className="text-muted-foreground">
                        {" "}
                        ({a.teacherEmail})
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={removeMutation.isPending}
                        onClick={() => removeMutation.mutate({ id: a.id })}
                      >
                        Remover
                      </Button>
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
