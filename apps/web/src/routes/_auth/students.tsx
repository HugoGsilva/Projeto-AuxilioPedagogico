import { Badge } from "@auxilio-pedagogico/ui/components/badge";
import {
  Button,
  buttonVariants,
} from "@auxilio-pedagogico/ui/components/button";
import { Callout } from "@auxilio-pedagogico/ui/components/callout";
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
import { cn } from "@auxilio-pedagogico/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  FileDown,
  GraduationCap,
  Info,
  Pencil,
  Plus,
  Power,
  Search,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { Page, PageHeader, Section } from "@/components/page";
import { QueryState } from "@/components/query-state";
import { useRole } from "@/lib/access";
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
type StatusFilter = "all" | "active" | "inactive";

type Student = {
  id: string;
  name: string;
  className: string | null;
  birthDate: string | null;
  guardian: string | null;
  shift: string | null;
  notes: string | null;
  active: boolean;
};

function StudentsPage() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const { role, can } = useRole();
  const canManage = can("manageStudents");
  const canViewCaseStudies = can("viewCaseStudy");
  const canGeneratePdf = can("generatePdf");
  const isTeacher = role === "teacher";

  const studentsQuery = useQuery({
    ...trpc.student.list.queryOptions(),
    enabled: Boolean(session?.user?.id),
  });

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [formOpen, setFormOpen] = useState(false);
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
    setFormOpen(false);
    setName("");
    setClassName("");
    setBirthDate("");
    setGuardian("");
    setShift("");
    setNotes("");
  }

  function startCreate() {
    setEditingId(null);
    setName("");
    setClassName("");
    setBirthDate("");
    setGuardian("");
    setShift("");
    setNotes("");
    setFormOpen(true);
  }

  function startEdit(s: Student) {
    setEditingId(s.id);
    setName(s.name);
    setClassName(s.className ?? "");
    setBirthDate(s.birthDate ?? "");
    setGuardian(s.guardian ?? "");
    setShift((s.shift as Shift | null) ?? "");
    setNotes(s.notes ?? "");
    setFormOpen(true);
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

  function notifyPdfUnavailable() {
    toast.info("Geração de PDF ainda não disponível.", {
      description: "Chega em uma próxima atualização.",
    });
  }

  const normalizedQuery = query.trim().toLowerCase();

  function filterStudents(students: Student[]): Student[] {
    return students.filter((s) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? s.active : !s.active);
      if (!matchesStatus) return false;
      if (!normalizedQuery) return true;
      return [s.name, s.className, s.guardian]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(normalizedQuery));
    });
  }

  return (
    <Page>
      <PageHeader
        title="Alunos"
        description="Cadastro e acompanhamento dos estudos de caso."
        actions={
          canManage && !formOpen ? (
            <Button onClick={startCreate}>
              <Plus />
              Novo aluno
            </Button>
          ) : null
        }
      />

      {isTeacher ? (
        <Callout>
          <Info />
          <span>Mostrando apenas alunos atribuídos a você.</span>
        </Callout>
      ) : null}

      {canManage && formOpen ? (
        <Section title={editingId ? "Editar cadastro do aluno" : "Novo aluno"}>
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
              <FieldLabel htmlFor="student-birth">
                Data de nascimento
              </FieldLabel>
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
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </Section>
      ) : null}

      <QueryState
        query={studentsQuery}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            icon={GraduationCap}
            title="Ainda não há alunos"
            description={
              canManage
                ? "Cadastre o primeiro aluno para começar a registrar estudos de caso."
                : "Nenhum aluno atribuído a você no momento. Fale com a direção ou a pedagoga."
            }
            action={
              canManage ? (
                <Button onClick={startCreate}>
                  <Plus />
                  Novo aluno
                </Button>
              ) : null
            }
          />
        }
      >
        {(students) => {
          const rows = filterStudents(students as Student[]);
          return (
            <section className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center">
                <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
                  <Search className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nome, turma ou responsável…"
                    aria-label="Buscar aluno"
                    className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as StatusFilter)
                  }
                  aria-label="Filtrar por situação"
                  className="h-10 w-full sm:w-auto"
                >
                  <option value="all">Situação: Todas</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </Select>
                <span className="text-sm text-muted-foreground tabular-nums sm:ml-auto">
                  {rows.length} {rows.length === 1 ? "aluno" : "alunos"}
                </span>
              </div>

              {rows.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Nenhum aluno encontrado para a busca ou filtro.
                </p>
              ) : (
                <>
                  {/* Tabela só a partir de lg */}
                  <div className="hidden lg:block">
                    <Table bare>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Aluno</TableHead>
                          <TableHead>Turma</TableHead>
                          <TableHead>Responsável</TableHead>
                          <TableHead>Situação</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">
                              {s.name}
                            </TableCell>
                            <TableCell>
                              {s.className ?? "—"}
                              {s.shift ? (
                                <span className="block text-xs text-muted-foreground">
                                  {SHIFT_LABELS[s.shift]}
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell>{s.guardian ?? "—"}</TableCell>
                            <TableCell>
                              <Badge variant={s.active ? "success" : "muted"}>
                                {s.active ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1.5">
                                {canViewCaseStudies ? (
                                  <Link
                                    to="/students/$studentId"
                                    params={{ studentId: s.id }}
                                    className={buttonVariants({
                                      variant: "outline-primary",
                                      size: "sm",
                                    })}
                                  >
                                    Estudos de caso
                                  </Link>
                                ) : null}
                                {canGeneratePdf ? (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Gerar PDF do estudo de caso"
                                    title="Gerar PDF do estudo de caso"
                                    onClick={notifyPdfUnavailable}
                                  >
                                    <FileDown />
                                  </Button>
                                ) : null}
                                {canManage ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label="Editar cadastro (turma, turno, responsável)"
                                      title="Editar cadastro (turma, turno, responsável)"
                                      onClick={() => startEdit(s)}
                                    >
                                      <Pencil />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label={
                                        s.active
                                          ? "Desativar aluno"
                                          : "Reativar aluno"
                                      }
                                      title={
                                        s.active
                                          ? "Desativar aluno"
                                          : "Reativar aluno"
                                      }
                                      disabled={setActiveMutation.isPending}
                                      onClick={() =>
                                        setActiveMutation.mutate({
                                          id: s.id,
                                          active: !s.active,
                                        })
                                      }
                                    >
                                      <Power
                                        className={cn(
                                          s.active
                                            ? "text-muted-foreground"
                                            : "text-success",
                                        )}
                                      />
                                    </Button>
                                  </>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile: cards */}
                  <ul className="divide-y divide-border lg:hidden">
                    {rows.map((s) => (
                      <li key={s.id} className="space-y-3 p-4">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{s.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {[
                                s.className,
                                s.shift ? SHIFT_LABELS[s.shift] : null,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "Sem turma"}
                            </p>
                          </div>
                          <Badge variant={s.active ? "success" : "muted"}>
                            {s.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Responsável: {s.guardian ?? "—"}
                        </p>
                        <div className="flex items-center gap-2">
                          {canViewCaseStudies ? (
                            <Link
                              to="/students/$studentId"
                              params={{ studentId: s.id }}
                              className={cn(
                                buttonVariants({ variant: "outline-primary" }),
                                "flex-1",
                              )}
                            >
                              Estudos de caso
                            </Link>
                          ) : null}
                          {canGeneratePdf ? (
                            <Button
                              variant="outline"
                              size="icon"
                              aria-label="Gerar PDF do estudo de caso"
                              title="Gerar PDF do estudo de caso"
                              onClick={notifyPdfUnavailable}
                            >
                              <FileDown />
                            </Button>
                          ) : null}
                          {canManage ? (
                            <Button
                              variant="outline"
                              size="icon"
                              aria-label="Editar cadastro (turma, turno, responsável)"
                              title="Editar cadastro (turma, turno, responsável)"
                              onClick={() => startEdit(s)}
                            >
                              <Pencil />
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          );
        }}
      </QueryState>
    </Page>
  );
}
