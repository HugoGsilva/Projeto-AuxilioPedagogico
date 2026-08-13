import { Button } from "@auxilio-pedagogico/ui/components/button";
import { Input } from "@auxilio-pedagogico/ui/components/input";
import { Label } from "@auxilio-pedagogico/ui/components/label";
import { Textarea } from "@auxilio-pedagogico/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canConfigure =
    role === "director" || role === "it_admin" || role === "pedagogue";

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

  const groups = useMemo(
    () => groupBySection((questionsQuery.data ?? []) as QuestionRow[]),
    [questionsQuery.data],
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
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">Perguntas</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Apenas direção, TI e pedagogas configuram as perguntas do estudo de
          caso.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-8 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perguntas</h1>
        <p className="text-sm text-muted-foreground">
          Configure enunciados, tipos, seções e a ordem das perguntas do estudo
          de caso.
        </p>
      </div>

      <section className="space-y-4 border border-border p-4">
        <h2 className="font-medium">
          {editingId ? "Editar pergunta" : "Nova pergunta"}
        </h2>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="question-prompt">Enunciado</Label>
            <Textarea
              id="question-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
              minLength={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="question-type">Tipo</Label>
            <select
              id="question-type"
              className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs"
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType)}
            >
              {QUESTION_TYPES.map((value) => (
                <option key={value} value={value}>
                  {TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="question-section">Seção</Label>
            <Input
              id="question-section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="Ex.: Informações pedagógicas"
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="question-required"
              type="checkbox"
              className="size-4"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
            />
            <Label htmlFor="question-required">Obrigatória</Label>
          </div>
          {typeNeedsOptions(type) ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="question-options">
                Opções (uma por linha)
              </Label>
              <Textarea
                id="question-options"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder={"Manhã\nTarde\nIntegral"}
                required
              />
            </div>
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
        {questionsQuery.isLoading || questionsQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : questionsQuery.isError ? (
          <p className="text-sm text-destructive">
            {questionsQuery.error.message}
          </p>
        ) : !questionsQuery.isFetched ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma pergunta cadastrada.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.section} className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {group.section}
              </h3>
              <div className="overflow-x-auto border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 font-medium">Ordem</th>
                      <th className="px-3 py-2 font-medium">Enunciado</th>
                      <th className="px-3 py-2 font-medium">Tipo</th>
                      <th className="px-3 py-2 font-medium">Obrig.</th>
                      <th className="px-3 py-2 font-medium">Situação</th>
                      <th className="px-3 py-2 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((q, index) => (
                      <tr
                        key={q.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <span className="tabular-nums">{q.sortOrder}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={
                                index === 0 || reorderMutation.isPending
                              }
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
                        </td>
                        <td className="px-3 py-2">{q.prompt}</td>
                        <td className="px-3 py-2">
                          {TYPE_LABELS[q.type] ?? q.type}
                        </td>
                        <td className="px-3 py-2">
                          {q.required ? "Sim" : "Não"}
                        </td>
                        <td className="px-3 py-2">
                          {q.active ? "Ativa" : "Inativa"}
                        </td>
                        <td className="px-3 py-2">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
