import { Button } from "@auxilio-pedagogico/ui/components/button";
import { Input } from "@auxilio-pedagogico/ui/components/input";
import { Label } from "@auxilio-pedagogico/ui/components/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/convite")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: InvitePage,
});

const ROLE_LABELS: Record<string, string> = {
  director: "Diretora",
  it_admin: "TI",
  pedagogue: "Pedagoga",
  teacher: "Professora",
};

/** Cartão único e genérico — não distingue expirado/usado/revogado/inexistente. */
function InviteUnavailable() {
  return (
    <Shell>
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Convite indisponível
        </h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Este convite não é mais válido — ele pode ter expirado, já ter sido
          usado ou sido cancelado. Fale com a coordenação da escola.
        </p>
      </div>
      <a
        href="/login"
        className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
      >
        Ir para o login
      </a>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-sm">
            AP
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">
            Auxílio Pedagógico
          </h1>
        </div>
        <div className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

function InvitePage() {
  const { token } = Route.useSearch();

  const previewQuery = useQuery({
    ...trpc.invitation.preview.queryOptions({ token }),
    enabled: token.length > 0,
    retry: false,
  });

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  // Semeia o nome uma vez com o valor sugerido pela diretora (editável).
  useEffect(() => {
    if (previewQuery.data?.name) setName(previewQuery.data.name);
  }, [previewQuery.data?.name]);

  const acceptMutation = useMutation(
    trpc.invitation.accept.mutationOptions({
      onSuccess: async ({ email }) => {
        // Reusa o login que já funciona: a pessoa já entra logada.
        await authClient.signIn.email(
          { email, password },
          {
            onSuccess: () => {
              // Redirect duro rebootstrapa o app com a sessão nova.
              window.location.assign("/dashboard");
            },
            onError: () => {
              toast.success("Conta criada. Faça login com a sua senha.");
              window.location.assign("/login");
            },
          },
        );
      },
      onError: () =>
        toast.error(
          "Não foi possível concluir o convite. Ele pode ter expirado ou já ter sido usado.",
        ),
    }),
  );

  if (token.length === 0 || previewQuery.isError) return <InviteUnavailable />;
  if (previewQuery.isPending) {
    return (
      <Shell>
        <Loader />
      </Shell>
    );
  }

  const preview = previewQuery.data;
  const roleLabel = ROLE_LABELS[preview.role] ?? preview.role;
  const canSubmit =
    name.trim().length >= 2 && password.length >= 8 && !acceptMutation.isPending;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    acceptMutation.mutate({ token, name, password });
  }

  return (
    <Shell>
      <div className="space-y-1 text-center">
        <p className="text-sm text-muted-foreground">Você foi convidada como</p>
        <p className="text-lg font-semibold">{roleLabel}</p>
        <p className="text-sm text-muted-foreground">{preview.email}</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="invite-name">Seu nome</Label>
          <Input
            id="invite-name"
            value={name}
            minLength={2}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-password">Crie sua senha</Label>
          <Input
            id="invite-password"
            type="password"
            autoComplete="new-password"
            value={password}
            minLength={8}
            required
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
        </div>
        <Button type="submit" className="w-full" disabled={!canSubmit}>
          {acceptMutation.isPending ? "Criando conta…" : "Criar conta e entrar"}
        </Button>
      </form>
    </Shell>
  );
}
