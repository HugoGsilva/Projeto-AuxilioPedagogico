import { Badge } from "@auxilio-pedagogico/ui/components/badge";
import { Button } from "@auxilio-pedagogico/ui/components/button";
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
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Page, PageHeader, Section, SectionLabel } from "@/components/page";
import { QueryState } from "@/components/query-state";
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
  const usersQuery = useQuery(trpc.user.list.queryOptions());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>("teacher");
  const [formOpen, setFormOpen] = useState(false);

  const createMutation = useMutation(
    trpc.user.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Usuário criado");
        setFormOpen(false);
        setName("");
        setEmail("");
        setPassword("");
        setRole("teacher");
        await queryClient.invalidateQueries(trpc.user.list.queryFilter());
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

  return (
    <Page>
      <PageHeader
        title="Usuários"
        description="Crie, edite o perfil e desative contas. Não há exclusão física."
        actions={
          formOpen ? null : (
            <Button onClick={() => setFormOpen(true)}>
              <Plus />
              Novo usuário
            </Button>
          )
        }
      />

      {formOpen ? (
        <Section title="Novo usuário">
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({ name, email, password, role });
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
              <FieldLabel htmlFor="password" required>
                Senha inicial
              </FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
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
                {createMutation.isPending ? "Criando…" : "Criar usuário"}
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

      <section className="space-y-3">
        <SectionLabel>Lista</SectionLabel>
        <QueryState
          query={usersQuery}
          isEmpty={(rows) => rows.length === 0}
          empty={
            <p className="text-sm text-muted-foreground">
              Nenhum usuário cadastrado.
            </p>
          }
        >
          {(users) => (
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
                        disabled={updateMutation.isPending}
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
          )}
        </QueryState>
      </section>
    </Page>
  );
}
