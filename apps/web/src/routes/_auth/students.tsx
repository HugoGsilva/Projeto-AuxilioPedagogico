import { Button } from "@auxilio-pedagogico/ui/components/button";
import { Input } from "@auxilio-pedagogico/ui/components/input";
import { Label } from "@auxilio-pedagogico/ui/components/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/students")({
  component: StudentsPage,
});

const SHIFT_LABELS: Record<string, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  full_day: "Integral",
};

const SHIFT_OPTIONS = ["morning", "afternoon", "full_day"] as const;

type Shift = (typeof SHIFT_OPTIONS)[number];

function StudentsPage() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canManage = role === "director" || role === "pedagogue";
  const canViewCaseStudies =
    role === "director" || role === "pedagogue" || role === "teacher";

  const studentsQuery = useQuery({
    ...trpc.student.list.queryOptions(),
    enabled: Boolean(session?.user?.id),
  });

  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [guardian, setGuardian] = useState("");
  const [shift, setShift] = useState<Shift | "">("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const createMutation = useMutation(
    trpc.student.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Aluno cadastrado");
        resetForm();
        await queryClient.invalidateQueries(trpc.student.list.queryFilter());
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.student.update.mutationOptions({
      onSuccess: async () => {
        toast.success("Aluno atualizado");
        resetForm();
        await queryClient.invalidateQueries(trpc.student.list.queryFilter());
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const setActiveMutation = useMutation(
    trpc.student.setActive.mutationOptions({
      onSuccess: async () => {
        toast.success("Situação atualizada");
        await queryClient.invalidateQueries(trpc.student.list.queryFilter());
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function resetForm() {
    setEditingId(null);
    setName("");
    setClassName("");
    setBirthDate("");
    setGuardian("");
    setShift("");
    setNotes("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      className: className || null,
      birthDate: birthDate || null,
      guardian: guardian || null,
      shift: shift || null,
      notes: notes || null,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-8 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alunos</h1>
        <p className="text-sm text-muted-foreground">
          Cadastro e acompanhamento dos alunos. Professoras veem apenas os
          atribuídos.
        </p>
      </div>

      {canManage ? (
        <section className="space-y-4 border border-border p-4">
          <h2 className="font-medium">
            {editingId ? "Editar aluno" : "Novo aluno"}
          </h2>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="student-name">Nome</Label>
              <Input
                id="student-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-class">Turma</Label>
              <Input
                id="student-class"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Ex.: 3º Ano A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-birth">Data de nascimento</Label>
              <Input
                id="student-birth"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-guardian">Responsável</Label>
              <Input
                id="student-guardian"
                value={guardian}
                onChange={(e) => setGuardian(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-shift">Turno</Label>
              <select
                id="student-shift"
                className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs"
                value={shift}
                onChange={(e) => setShift(e.target.value as Shift | "")}
              >
                <option value="">Não informado</option>
                {SHIFT_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {SHIFT_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="student-notes">Observações</Label>
              <Input
                id="student-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? "Salvar" : "Cadastrar"}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-medium">Lista</h2>
        {studentsQuery.isLoading || studentsQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : studentsQuery.isError ? (
          <p className="text-sm text-destructive">
            {studentsQuery.error.message}
          </p>
        ) : !studentsQuery.isFetched ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : studentsQuery.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aluno listado.</p>
        ) : (
          <div className="overflow-x-auto border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Nome</th>
                  <th className="px-3 py-2 font-medium">Turma</th>
                  <th className="px-3 py-2 font-medium">Turno</th>
                  <th className="px-3 py-2 font-medium">Responsável</th>
                  <th className="px-3 py-2 font-medium">Situação</th>
                  {canViewCaseStudies ? (
                    <th className="px-3 py-2 font-medium">Ações</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {studentsQuery.data?.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-3 py-2">{s.name}</td>
                    <td className="px-3 py-2">{s.className ?? "—"}</td>
                    <td className="px-3 py-2">
                      {s.shift ? SHIFT_LABELS[s.shift] : "—"}
                    </td>
                    <td className="px-3 py-2">{s.guardian ?? "—"}</td>
                    <td className="px-3 py-2">
                      {s.active ? "Ativo" : "Inativo"}
                    </td>
                    {canViewCaseStudies ? (
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to="/students/$studentId"
                            params={{ studentId: s.id }}
                            className="inline-flex h-7 items-center rounded-none border border-border bg-background px-2.5 text-xs hover:bg-muted"
                          >
                            Estudos de caso
                          </Link>
                          {canManage ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingId(s.id);
                                  setName(s.name);
                                  setClassName(s.className ?? "");
                                  setBirthDate(s.birthDate ?? "");
                                  setGuardian(s.guardian ?? "");
                                  setShift((s.shift as Shift | null) ?? "");
                                  setNotes(s.notes ?? "");
                                }}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={setActiveMutation.isPending}
                                onClick={() =>
                                  setActiveMutation.mutate({
                                    id: s.id,
                                    active: !s.active,
                                  })
                                }
                              >
                                {s.active ? "Desativar" : "Reativar"}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
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
