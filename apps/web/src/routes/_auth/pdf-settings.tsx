import { Button } from "@auxilio-pedagogico/ui/components/button";
import { Field, FieldLabel } from "@auxilio-pedagogico/ui/components/field";
import { Input } from "@auxilio-pedagogico/ui/components/input";
import { Skeleton } from "@auxilio-pedagogico/ui/components/skeleton";
import { Textarea } from "@auxilio-pedagogico/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Page, PageHeader, Section } from "@/components/page";
import { useRole } from "@/lib/access";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/pdf-settings")({
  component: PdfSettingsPage,
});

function PdfSettingsPage() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const canConfigure = useRole().can("configurePdfSettings");

  const settingsQuery = useQuery({
    ...trpc.pdfSettings.get.queryOptions(),
    enabled: Boolean(session?.user?.id),
  });

  const [schoolName, setSchoolName] = useState("");
  const [institutionalInfo, setInstitutionalInfo] = useState("");
  /* Semeia o form uma vez: refetch (foco da janela) não sobrescreve edição. */
  const seededRef = useRef(false);

  useEffect(() => {
    if (settingsQuery.data === undefined || seededRef.current) return;
    seededRef.current = true;
    setSchoolName(settingsQuery.data?.schoolName ?? "");
    setInstitutionalInfo(settingsQuery.data?.institutionalInfo ?? "");
  }, [settingsQuery.data]);

  const updateMutation = useMutation(
    trpc.pdfSettings.update.mutationOptions({
      onSuccess: async (saved) => {
        toast.success("Configuração salva", {
          description: "Os dados passam a valer para os próximos PDFs.",
        });
        setSchoolName(saved.schoolName);
        setInstitutionalInfo(saved.institutionalInfo ?? "");
        await queryClient.invalidateQueries(trpc.pdfSettings.get.queryFilter());
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canConfigure) return;
    updateMutation.mutate({
      schoolName,
      institutionalInfo: institutionalInfo.trim() ? institutionalInfo : null,
    });
  }

  const errorMessage = settingsQuery.error?.message;

  return (
    <Page>
      <PageHeader
        title="Configuração do PDF"
        description="Dados da escola exibidos no documento PDF do estudo de caso. Não alteram a aparência do sistema."
      />

      {/* isPending (não isLoading): com a query desabilitada enquanto a
        * sessão carrega, isLoading=false mostraria o form vazio por engano. */}
      {settingsQuery.isPending && !settingsQuery.isError ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}

      {!settingsQuery.isPending && !errorMessage ? (
        <Section title="Dados da escola">
          <form className="max-w-2xl space-y-4" onSubmit={onSubmit}>
            <Field>
              <FieldLabel htmlFor="pdf-school-name" required>
                Nome da escola
              </FieldLabel>
              <Input
                id="pdf-school-name"
                value={schoolName}
                required
                minLength={2}
                maxLength={200}
                disabled={!canConfigure}
                onChange={(e) => setSchoolName(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Aparece no cabeçalho do documento gerado.
              </p>
            </Field>
            <Field>
              <FieldLabel htmlFor="pdf-institutional-info">
                Dados institucionais
              </FieldLabel>
              <Textarea
                id="pdf-institutional-info"
                value={institutionalInfo}
                maxLength={2000}
                disabled={!canConfigure}
                onChange={(e) => setInstitutionalInfo(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Endereço, contato ou outras informações exigidas pela escola
                (opcional).
              </p>
            </Field>
            {canConfigure ? (
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando…" : "Salvar configuração"}
              </Button>
            ) : null}
          </form>
        </Section>
      ) : null}
    </Page>
  );
}
