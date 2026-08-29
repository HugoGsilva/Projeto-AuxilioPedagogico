import {
  Button,
  buttonVariants,
} from "@auxilio-pedagogico/ui/components/button";
import { Field, FieldLabel } from "@auxilio-pedagogico/ui/components/field";
import { Input } from "@auxilio-pedagogico/ui/components/input";
import { Select } from "@auxilio-pedagogico/ui/components/select";
import { Skeleton } from "@auxilio-pedagogico/ui/components/skeleton";
import { Textarea } from "@auxilio-pedagogico/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import {
  Page,
  PageBackIcon,
  pageBackClass,
  PageHeader,
  Section,
} from "@/components/page";
import { useRole } from "@/lib/access";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/case-studies/$caseStudyId")({
  component: CaseStudyFormPage,
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

type FormField = {
  questionId: string;
  prompt: string;
  type: QuestionType;
  options: string[] | null;
  section: string | null;
  required: boolean;
};

function typeNeedsOptions(type: QuestionType): boolean {
  return type === "multiple_choice" || type === "select";
}

function groupFields(fields: FormField[]): {
  section: string;
  items: FormField[];
}[] {
  const map = new Map<string, FormField[]>();
  for (const field of fields) {
    const key = field.section?.trim() || "Sem seção";
    const list = map.get(key) ?? [];
    list.push(field);
    map.set(key, list);
  }
  return [...map.entries()].map(([section, items]) => ({ section, items }));
}

function CaseStudyFormPage() {
  const { caseStudyId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const { can } = useRole();
  const canEdit = can("editCaseStudy");
  const canConfigureQuestions = can("configureQuestions");

  const caseStudyQuery = useQuery({
    ...trpc.caseStudy.byId.queryOptions({ id: caseStudyId }),
    enabled: Boolean(session?.user?.id),
  });

  const activeQuestionsQuery = useQuery({
    ...trpc.question.listActive.queryOptions(),
    enabled: Boolean(session?.user?.id),
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [freeReport, setFreeReport] = useState("");
  /* O formulário só é semeado uma vez por estudo de caso: refetches da query
   * (invalidação do form irmão, foco da janela) não podem sobrescrever texto
   * digitado e ainda não salvo. */
  const seededForRef = useRef<string | null>(null);

  const fields = useMemo((): FormField[] => {
    const answers = caseStudyQuery.data?.answers ?? [];
    const active = activeQuestionsQuery.data ?? [];
    const result: FormField[] = [];

    for (const question of active) {
      const existing = answers.find((row) => row.questionId === question.id);
      if (existing) {
        result.push({
          questionId: existing.questionId,
          prompt: existing.questionSnapshot.prompt,
          type: existing.questionSnapshot.type,
          options: existing.questionSnapshot.options,
          section: existing.questionSnapshot.section,
          required: existing.questionSnapshot.required,
        });
      } else {
        result.push({
          questionId: question.id,
          prompt: question.prompt,
          type: question.type,
          options: question.options,
          section: question.section,
          required: question.required,
        });
      }
    }

    for (const existing of answers) {
      if (!active.some((q) => q.id === existing.questionId)) {
        result.push({
          questionId: existing.questionId,
          prompt: existing.questionSnapshot.prompt,
          type: existing.questionSnapshot.type,
          options: existing.questionSnapshot.options,
          section: existing.questionSnapshot.section,
          required: existing.questionSnapshot.required,
        });
      }
    }

    return result;
  }, [activeQuestionsQuery.data, caseStudyQuery.data?.answers]);

  const groups = useMemo(() => groupFields(fields), [fields]);

  useEffect(() => {
    if (!caseStudyQuery.data || !activeQuestionsQuery.data) return;
    if (seededForRef.current === caseStudyQuery.data.id) return;
    seededForRef.current = caseStudyQuery.data.id;
    const next: Record<string, string> = {};
    for (const answer of caseStudyQuery.data.answers) {
      next[answer.questionId] = answer.value ?? "";
    }
    for (const question of activeQuestionsQuery.data) {
      if (!(question.id in next)) next[question.id] = "";
    }
    setValues(next);
    setFreeReport(caseStudyQuery.data.freeReport ?? "");
  }, [activeQuestionsQuery.data, caseStudyQuery.data]);

  const saveMutation = useMutation(
    trpc.caseStudy.saveAnswers.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.caseStudy.byId.queryFilter({ id: caseStudyId }),
        );

        /* Sair da tela ao salvar: o formulário é longo e continuar nele, com
         * os mesmos campos preenchidos, não deixa claro que o registro foi
         * concluído. Volta para a lista de estudos de caso do aluno, que
         * mostra o "Atualizado em" recém-gravado. Sem studentId (a query do
         * estudo ainda não respondeu) fica na tela e só avisa. */
        const backTo = caseStudyQuery.data?.studentId;
        /* Não sair da tela com relatório livre digitado e não salvo — a
         * navegação descartaria o texto silenciosamente. */
        const freeReportDirty =
          freeReport !== (caseStudyQuery.data?.freeReport ?? "");
        if (backTo && !freeReportDirty) {
          toast.success("Respostas salvas", {
            description: "O estudo de caso foi atualizado.",
          });
          await navigate({
            to: "/students/$studentId",
            params: { studentId: backTo },
          });
        } else if (freeReportDirty) {
          toast.success("Respostas salvas", {
            description:
              "O relatório livre tem alterações não salvas — salve-o antes de sair.",
          });
        } else {
          toast.success("Respostas salvas");
        }
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    saveMutation.mutate({
      caseStudyId,
      answers: fields.map((field) => ({
        questionId: field.questionId,
        value: values[field.questionId]?.trim()
          ? values[field.questionId]
          : null,
      })),
    });
  }

  const freeReportMutation = useMutation(
    trpc.caseStudy.saveFreeReport.mutationOptions({
      onSuccess: async (saved) => {
        toast.success("Relatório salvo");
        // Reflete a normalização do servidor (trim/blank→null) no campo.
        setFreeReport(saved.freeReport ?? "");
        await queryClient.invalidateQueries(
          trpc.caseStudy.byId.queryFilter({ id: caseStudyId }),
        );
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function onSubmitFreeReport(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    freeReportMutation.mutate({
      caseStudyId,
      freeReport: freeReport.trim() ? freeReport : null,
    });
  }

  const errorMessage =
    caseStudyQuery.error?.message ?? activeQuestionsQuery.error?.message;
  const isLoading = caseStudyQuery.isLoading || activeQuestionsQuery.isLoading;
  const studentId = caseStudyQuery.data?.studentId;
  const emptyForm = !isLoading && !errorMessage && fields.length === 0;

  return (
    <Page>
      <PageHeader
        back={
          studentId ? (
            <Link
              to="/students/$studentId"
              params={{ studentId }}
              className={pageBackClass}
            >
              <PageBackIcon />
              Voltar para estudos de caso
            </Link>
          ) : (
            <Link to="/students" className={pageBackClass}>
              <PageBackIcon />
              Voltar para alunos
            </Link>
          )
        }
        title="Estudo de caso"
        description={
          caseStudyQuery.data
            ? `${caseStudyQuery.data.studentName}${
                caseStudyQuery.data.className
                  ? ` · ${caseStudyQuery.data.className}`
                  : ""
              }`
            : "Preencha as respostas com o enunciado vigente no momento do salvamento."
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}

      {emptyForm ? (
        <EmptyState
          icon={ClipboardList}
          title="Ainda não há perguntas para preencher"
          description="Configure as perguntas do estudo de caso antes de registrar respostas."
          action={
            canConfigureQuestions ? (
              <Link to="/questions" className={buttonVariants()}>
                Configurar perguntas
              </Link>
            ) : null
          }
        />
      ) : null}

      {!isLoading && !errorMessage && fields.length > 0 ? (
        <form className="space-y-6" onSubmit={onSubmit}>
          {groups.map((group) => (
            <Section key={group.section} title={group.section}>
              {group.items.map((field) => {
                const fieldId = `answer-${field.questionId}`;
                const value = values[field.questionId] ?? "";
                return (
                  <Field key={field.questionId}>
                    <FieldLabel htmlFor={fieldId} required={field.required}>
                      {field.prompt}
                    </FieldLabel>
                    {field.type === "long_text" ? (
                      <Textarea
                        id={fieldId}
                        value={value}
                        required={field.required}
                        disabled={!canEdit}
                        onChange={(e) =>
                          setValues((current) => ({
                            ...current,
                            [field.questionId]: e.target.value,
                          }))
                        }
                      />
                    ) : field.type === "number" ? (
                      <Input
                        id={fieldId}
                        type="number"
                        step="any"
                        value={value}
                        required={field.required}
                        disabled={!canEdit}
                        onChange={(e) =>
                          setValues((current) => ({
                            ...current,
                            [field.questionId]: e.target.value,
                          }))
                        }
                      />
                    ) : field.type === "date" ? (
                      <Input
                        id={fieldId}
                        type="date"
                        value={value}
                        required={field.required}
                        disabled={!canEdit}
                        onChange={(e) =>
                          setValues((current) => ({
                            ...current,
                            [field.questionId]: e.target.value,
                          }))
                        }
                      />
                    ) : typeNeedsOptions(field.type) ? (
                      <Select
                        id={fieldId}
                        value={value}
                        required={field.required}
                        disabled={!canEdit}
                        onChange={(e) =>
                          setValues((current) => ({
                            ...current,
                            [field.questionId]: e.target.value,
                          }))
                        }
                      >
                        <option value="">Selecione…</option>
                        {(field.options ?? []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        id={fieldId}
                        value={value}
                        required={field.required}
                        disabled={!canEdit}
                        onChange={(e) =>
                          setValues((current) => ({
                            ...current,
                            [field.questionId]: e.target.value,
                          }))
                        }
                      />
                    )}
                  </Field>
                );
              })}
            </Section>
          ))}
          {canEdit ? (
            /* Barra fixa: o formulário costuma passar da dobra e a ação
             * principal não pode depender de rolar até o fim. */
            <div className="sticky bottom-4 rounded-lg border border-border bg-card/95 p-4 shadow-lg backdrop-blur">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Salvando…" : "Salvar respostas"}
                </Button>
                <p className="text-sm text-muted-foreground text-pretty">
                  As respostas guardam o enunciado vigente no momento do
                  salvamento.
                </p>
              </div>
            </div>
          ) : null}
        </form>
      ) : null}

      {!isLoading && !errorMessage && caseStudyQuery.data ? (
        /* Form irmão do de respostas: o relatório livre é um campo do estudo
         * de caso, salvo e auditado à parte (freeReport.update), e não pode
         * ficar refém da validação `required` das perguntas estruturadas. */
        <form onSubmit={onSubmitFreeReport}>
          <Section
            title="Relatório livre"
            description="Observações detalhadas da professora: comportamento em sala, participação, dificuldades, avanços, estratégias pedagógicas, adaptações realizadas e necessidades de apoio."
          >
            <Field>
              <FieldLabel htmlFor="free-report">
                Observações da professora
              </FieldLabel>
              <Textarea
                id="free-report"
                className="min-h-40"
                maxLength={20000}
                value={freeReport}
                disabled={!canEdit}
                onChange={(e) => setFreeReport(e.target.value)}
              />
            </Field>
            {canEdit ? (
              <Button type="submit" disabled={freeReportMutation.isPending}>
                {freeReportMutation.isPending ? "Salvando…" : "Salvar relatório"}
              </Button>
            ) : null}
          </Section>
        </form>
      ) : null}
    </Page>
  );
}
