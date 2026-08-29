import { Badge } from "@auxilio-pedagogico/ui/components/badge";
import { Button } from "@auxilio-pedagogico/ui/components/button";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, MailPlus, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { Page, PageHeader, Section, SectionLabel } from "@/components/page";
import { QueryState } from "@/components/query-state";
import { useRole } from "@/lib/access";
import { formatDateTime } from "@/lib/format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/users")({
  component: UsersPage,
});

const ROLE_LABELS: Record<string, string> = {
  director: "Diretora",
  it_admin: "TI",
  pedagogue: "Pedagoga",
  teacher: "Professora",
};

const ROLE_OPTIONS = ["director", "it_admin", "pedagogue", "teacher"] as const;

function UsersPage() {
  const queryClient = useQueryClient();
  const { can } = useRole();
  // Só a diretora convida e troca papéis (ADR-0002). O TI vê as contas e
  // ativa/desativa, mas sem UI de convite nem edição de papel.
  const canInvite = can("manageInvitations");
  const canAssignRoles = can("assignRoles");

  const usersQuery = useQuery(trpc.user.list.queryOptions());
  const invitationsQuery = useQuery({
    ...trpc.invitation.list.queryOptions(),
    // Não dispara a query (que o servidor negaria com 403) para quem não convida.
    enabled: canInvite,
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>("teacher");
  const [formOpen, setFormOpen] = useState(false);
  // O link só existe no momento da criação/regeneração (o banco guarda só o hash).
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  async function refreshInvites() {
    await queryClient.invalidateQueries(trpc.invitation.list.queryFilter());
  }

  const createMutation = useMutation(
    trpc.invitation.create.mutationOptions({
      onSuccess: async ({ inviteUrl }) => {
        toast.success("Convite criado");
        setGeneratedLink(inviteUrl);
        setFormOpen(false);
        setName("");
        setEmail("");
        setRole("teacher");
        await refreshInvites();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const regenerateMutation = useMutation(
    trpc.invitation.regenerate.mutationOptions({
      onSuccess: async ({ inviteUrl }) => {
        toast.success("Novo link gerado");
        setGeneratedLink(inviteUrl);
        await refreshInvites();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const revokeMutation = useMutation(
    trpc.invitation.revoke.mutationOptions({
      onSuccess: async () => {
        toast.success("Convite cancelado");
        // O link recém-exibido pode ser o que acabou de ser revogado — some com
        // ele p/ não copiarem um convite morto.
        setGeneratedLink(null);
        await refreshInvites();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const setActiveMutation = useMutation(
    trpc.user.setActive.mutationOptions({
      onSuccess: async () => {
        toast.success("Situação atualizada");
        await queryClient.invalidateQueries(trpc.user.list.queryFilter());
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.user.update.mutationOptions({
      onSuccess: async () => {
        toast.success("Usuário atualizado");
        await queryClient.invalidateQueries(trpc.user.list.queryFilter());
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar — selecione o link manualmente.");
    }
  }

  return (
    <Page>
      <PageHeader
        title="Usuários"
        description="Convide a equipe, edite perfis e desative contas. A pessoa define a própria senha ao aceitar o convite."
        actions={
          canInvite && !formOpen ? (
            <Button onClick={() => setFormOpen(true)}>
              <MailPlus />
              Convidar
            </Button>
          ) : null
        }
      />

      {generatedLink ? (
        <Callout>
          <div className="w-full space-y-2">
            <p className="text-sm font-medium">
              Convite criado — copie o link agora
            </p>
            <p className="text-xs text-muted-foreground">
              Envie este link para a pessoa. Por segurança ele não é exibido de
              novo; se precisar, use “Regenerar link” na lista de pendentes.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input readOnly value={generatedLink} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                onClick={() => copyLink(generatedLink)}
              >
                <Copy />
                Copiar link
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setGeneratedLink(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </Callout>
      ) : null}

      {canInvite && formOpen ? (
        <Section title="Convidar pessoa">
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({ name, email, role });
            }}
          >
            <Field>
              <FieldLabel htmlFor="name" required>
                Nome
              </FieldLabel>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="email" required>
                E-mail
              </FieldLabel>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="role">Perfil</FieldLabel>
              <Select
                id="role"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as (typeof ROLE_OPTIONS)[number])
                }
              >
                {ROLE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {ROLE_LABELS[value]}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Gerando…" : "Gerar convite"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Section>
      ) : null}

      {invitationsQuery.isError ? (
        <section className="space-y-3">
          <SectionLabel>Convites pendentes</SectionLabel>
          <p className="text-sm text-destructive">
            Não foi possível carregar os convites pendentes. Recarregue a página.
          </p>
        </section>
      ) : (invitationsQuery.data ?? []).length > 0 ? (
        <section className="space-y-3">
          <SectionLabel>Convites pendentes</SectionLabel>
          <ul className="space-y-3">
            {(invitationsQuery.data ?? []).map((inv) => (
              <li
                key={inv.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium">{inv.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {inv.email} · {ROLE_LABELS[inv.role] ?? inv.role}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expira em {formatDateTime(inv.expiresAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="pending">Pendente</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={regenerateMutation.isPending}
                    onClick={() => regenerateMutation.mutate({ id: inv.id })}
                  >
                    Regenerar link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={revokeMutation.isPending}
                    onClick={() => revokeMutation.mutate({ id: inv.id })}
                  >
                    Revogar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <SectionLabel>Contas</SectionLabel>
        <QueryState
          query={usersQuery}
          isEmpty={(rows) => rows.length === 0}
          empty={
            <EmptyState
              icon={UsersRound}
              title="Ainda não há usuários"
              description="Convide a primeira pessoa para que a equipe consiga entrar no sistema."
              action={
                canInvite ? (
                  <Button onClick={() => setFormOpen(true)}>
                    <MailPlus />
                    Convidar
                  </Button>
                ) : undefined
              }
            />
          }
        >
          {(users) => (
            <>
              {/* Tabela só a partir de lg */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Select
                            className="w-auto"
                            value={u.role}
                            disabled={updateMutation.isPending || !canAssignRoles}
                            onChange={(e) =>
                              updateMutation.mutate({
                                id: u.id,
                                role: e.target
                                  .value as (typeof ROLE_OPTIONS)[number],
                              })
                            }
                          >
                            {ROLE_OPTIONS.map((value) => (
                              <option key={value} value={value}>
                                {ROLE_LABELS[value]}
                              </option>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.active ? "success" : "muted"}>
                            {u.active ? "Ativo" : "Desativado"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={setActiveMutation.isPending}
                            onClick={() =>
                              setActiveMutation.mutate({
                                id: u.id,
                                active: !u.active,
                              })
                            }
                          >
                            {u.active ? "Desativar" : "Reativar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: cards — na tabela as colunas de ação saíam da tela. */}
              <ul className="space-y-3 lg:hidden">
                {users.map((u) => (
                  <li
                    key={u.id}
                    className="space-y-3 rounded-lg border border-border bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{u.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {u.email}
                        </p>
                      </div>
                      <Badge variant={u.active ? "success" : "muted"}>
                        {u.active ? "Ativo" : "Desativado"}
                      </Badge>
                    </div>
                    <Field>
                      <FieldLabel htmlFor={`role-${u.id}`}>Perfil</FieldLabel>
                      <Select
                        id={`role-${u.id}`}
                        value={u.role}
                        disabled={updateMutation.isPending || !canAssignRoles}
                        onChange={(e) =>
                          updateMutation.mutate({
                            id: u.id,
                            role: e.target
                              .value as (typeof ROLE_OPTIONS)[number],
                          })
                        }
                      >
                        {ROLE_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {ROLE_LABELS[value]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={setActiveMutation.isPending}
                      onClick={() =>
                        setActiveMutation.mutate({
                          id: u.id,
                          active: !u.active,
                        })
                      }
                    >
                      {u.active ? "Desativar" : "Reativar"}
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </QueryState>
      </section>
    </Page>
  );
}
