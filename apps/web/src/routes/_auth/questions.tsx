import { Badge } from "@auxilio-pedagogico/ui/components/badge";
import { Button } from "@auxilio-pedagogico/ui/components/button";
import { Checkbox } from "@auxilio-pedagogico/ui/components/checkbox";
import { Field, FieldLabel } from "@auxilio-pedagogico/ui/components/field";
import { Input } from "@auxilio-pedagogico/ui/components/input";
import { Label } from "@auxilio-pedagogico/ui/components/label";
import { Select } from "@auxilio-pedagogico/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@auxilio-pedagogico/ui/components/table";
import { Textarea } from "@auxilio-pedagogico/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { QueryState } from "@/components/query-state";
import { useRole } from "@/lib/access";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/questions")({
  component: QuestionsPage,
});

const QUESTION_TYPES = [
  "short_text",
  "long_text",
  "multiple_choice",
  "date",
  "number",
  "select",
] as const;

type QuestionType = (typeof QUESTION_TYPES)[number];

const TYPE_LABELS: Record<QuestionType, string> = {
  short_text: "Texto curto",
  long_text: "Texto longo",
  multiple_choice: "Múltipla escolha",
  date: "Data",
  number: "Número",
  select: "Lista (select)",
};

function typeNeedsOptions(type: QuestionType): boolean {
  return type === "multiple_choice" || type === "select";
}

function parseOptionsText(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

type QuestionRow = {
  id: string;
  prompt: string;
  type: QuestionType;
  section: string | null;
  sortOrder: number;
  required: boolean;
  active: boolean;
  options: string[] | null;
};

function groupBySection(rows: QuestionRow[]): {
  section: string;
  items: QuestionRow[];
}[] {
  const map = new Map<string, QuestionRow[]>();
  for (const row of rows) {
    const key = row.section?.trim() || "Sem seção";
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return [...map.entries()].map(([section, items]) => ({
    section,
    items: [...items].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.prompt.localeCompare(b.prompt),
    ),
  }));
}

function QuestionsPage() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const canConfigure = useRole().can("configureQuestions");

  const questionsQuery = useQuery({
    ...trpc.question.list.queryOptions(),
    enabled: Boolean(session?.user?.id) && canConfigure,
  });

  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<QuestionType>("short_text");
  const [section, setSection] = useState("");
  const [required, setRequired] = useState(false);
  const [optionsText, setOptionsText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const createMutation = useMutation(
    trpc.question.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Pergunta criada");
        resetForm();
        await queryClient.invalidateQueries(trpc.question.list.queryFilter());
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.question.update.mutationOptions({
      onSuccess: async () => {
        toast.success("Pergunta atualizada");
        resetForm();
        await queryClient.invalidateQueries(trpc.question.list.queryFilter());
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const setActiveMutation = useMutation(
    trpc.question.setActive.mutationOptions({
      onSuccess: async () => {
        toast.success("Situação atualizada");
        await queryClient.invalidateQueries(trpc.question.list.queryFilter());
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const reorderMutation = useMutation(
    trpc.question.reorder.mutationOptions({
      onSuccess: async () => {
        toast.success("Ordem atualizada");
        await queryClient.invalidateQueries(trpc.question.list.queryFilter());
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function resetForm() {
    setEditingId(null);
    setPrompt("");
    setType("short_text");
    setSection("");
    setRequired(false);
    setOptionsText("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const options = typeNeedsOptions(type)
      ? parseOptionsText(optionsText)
      : null;
    const payload = {
      prompt,
      type,
      section: section || null,
      required,
      options,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function moveQuestion(
    sectionItems: QuestionRow[],
    id: string,
    direction: "up" | "down",
  ) {
    const orderedIds = sectionItems.map((q) => q.id);
    const index = orderedIds.indexOf(id);
    if (index < 0) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= orderedIds.length) return;

    const next = [...orderedIds];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(target, 0, moved);

    reorderMutation.mutate({
      items: next.map((itemId, sortOrder) => ({
        id: itemId,
        sortOrder,
        section: sectionItems.find((q) => q.id === itemId)?.section ?? null,
      })),
    });
  }

  if (!canConfigure) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">Perguntas</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Apenas direção, TI e pedagogas configuram as perguntas do estudo de
          caso.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perguntas</h1>
        <p className="text-sm text-muted-foreground">
          Configure enunciados, tipos, seções e a ordem das perguntas do estudo
          de caso.
        </p>
      </div>

      <section className="space-y-4 rounded-lg border border-border bg-card p-5">
        <h2 className="font-medium">
          {editingId ? "Editar pergunta" : "Nova pergunta"}
        </h2>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="question-prompt" required>
              Enunciado
            </FieldLabel>
            <Textarea
              id="question-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
              minLength={3}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="question-type">Tipo</FieldLabel>
            <Select
              id="question-type"
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType)}
            >
              {QUESTION_TYPES.map((value) => (
                <option key={value} value={value}>
                  {TYPE_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="question-section">Seção</FieldLabel>
            <Input
              id="question-section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="Ex.: Informações pedagógicas"
            />
          </Field>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox
              id="question-required"
              checked={required}
              onCheckedChange={(checked) => setRequired(checked === true)}
            />
            <Label htmlFor="question-required">Obrigatória</Label>
          </div>
          {typeNeedsOptions(type) ? (
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="question-options" required>
                Opções (uma por linha)
              </FieldLabel>
              <Textarea
                id="question-options"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder={"Manhã\nTarde\nIntegral"}
                required
              />
            </Field>
          ) : null}
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

      <section className="space-y-4">
        <h2 className="font-medium">Lista por seção</h2>
        <QueryState
          query={questionsQuery}
          isEmpty={(rows) => rows.length === 0}
          empty={
            <p className="text-sm text-muted-foreground">
              Nenhuma pergunta cadastrada.
            </p>
          }
        >
          {(rows) =>
            groupBySection(rows as QuestionRow[]).map((group) => (
              <div key={group.section} className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {group.section}
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ordem</TableHead>
                      <TableHead>Enunciado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Obrig.</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((q, index) => (
                      <TableRow key={q.id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="tabular-nums">{q.sortOrder}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={index === 0 || reorderMutation.isPending}
                              onClick={() =>
                                moveQuestion(group.items, q.id, "up")
                              }
                              aria-label="Mover para cima"
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={
                                index === group.items.length - 1 ||
                                reorderMutation.isPending
                              }
                              onClick={() =>
                                moveQuestion(group.items, q.id, "down")
                              }
                              aria-label="Mover para baixo"
                            >
                              ↓
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{q.prompt}</TableCell>
                        <TableCell>{TYPE_LABELS[q.type] ?? q.type}</TableCell>
                        <TableCell>{q.required ? "Sim" : "Não"}</TableCell>
                        <TableCell>
                          <Badge variant={q.active ? "success" : "muted"}>
                            {q.active ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingId(q.id);
                                setPrompt(q.prompt);
                                setType(q.type);
                                setSection(q.section ?? "");
                                setRequired(q.required);
                                setOptionsText(
                                  Array.isArray(q.options)
                                    ? q.options.join("\n")
                                    : "",
                                );
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
                                  id: q.id,
                                  active: !q.active,
                                })
                              }
                            >
                              {q.active ? "Desativar" : "Reativar"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))
          }
        </QueryState>
      </section>
    </div>
  );
}
