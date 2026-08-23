import { Badge } from "@auxilio-pedagogico/ui/components/badge";
import { Button, buttonVariants } from "@auxilio-pedagogico/ui/components/button";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@auxilio-pedagogico/ui/components/empty";
import { Field, FieldLabel } from "@auxilio-pedagogico/ui/components/field";
import { Input } from "@auxilio-pedagogico/ui/components/input";
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
import { useState } from "react";
import { toast } from "sonner";

import { QueryState } from "@/components/query-state";
import { Can, useRole } from "@/lib/access";
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
  const { can } = useRole();
  const canManage = can("manageStudents");
  const canViewCaseStudies = can("viewCaseStudy");

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

      <Can permission="manageStudents">
        <section className="space-y-4 rounded-lg border border-border p-5">
          <h2 className="font-medium">
            {editingId ? "Editar aluno" : "Novo aluno"}
          </h2>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <Field>
              <FieldLabel htmlFor="student-name" required>
                Nome
              </FieldLabel>
              <Input
                id="student-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="student-class">Turma</FieldLabel>
              <Input
                id="student-class"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Ex.: 3º Ano A"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="student-birth">Data de nascimento</FieldLabel>
              <Input
                id="student-birth"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="student-guardian">Responsável</FieldLabel>
              <Input
                id="student-guardian"
                value={guardian}
                onChange={(e) => setGuardian(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="student-shift">Turno</FieldLabel>
              <Select
                id="student-shift"
                value={shift}
                onChange={(e) => setShift(e.target.value as Shift | "")}
              >
                <option value="">Não informado</option>
                {SHIFT_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {SHIFT_LABELS[value]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="student-notes">Observações</FieldLabel>
              <Input
                id="student-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
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
      </Can>

      <section className="space-y-3">
        <h2 className="font-medium">Lista</h2>
        <QueryState
          query={studentsQuery}
          isEmpty={(rows) => rows.length === 0}
          empty={
            <Empty className="border border-border">
              <EmptyHeader>
                <EmptyTitle>Nenhum aluno listado</EmptyTitle>
                <EmptyDescription>
                  {canManage
                    ? "Cadastre o primeiro aluno usando o formulário acima."
                    : "Nenhum aluno atribuído a você no momento."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          }
        >
          {(students) => (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Situação</TableHead>
                  {canViewCaseStudies ? <TableHead>Ações</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.className ?? "—"}</TableCell>
                    <TableCell>{s.shift ? SHIFT_LABELS[s.shift] : "—"}</TableCell>
                    <TableCell>{s.guardian ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={s.active ? "success" : "muted"}>
                        {s.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    {canViewCaseStudies ? (
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to="/students/$studentId"
                            params={{ studentId: s.id }}
                            className={buttonVariants({
                              variant: "outline",
                              size: "sm",
                            })}
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
                      </TableCell>
                    ) : null}
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
