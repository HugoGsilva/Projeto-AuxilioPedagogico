# ADR-0008 — Convite de usuários com link de uso único

- **Status:** aceita
- **Data:** 2026-08-29

## Contexto

O sistema não tem auto-cadastro (Better Auth com `disableSignUp`, [ADR-0002](0002-permissoes-roles-fixas.md)). Até aqui, novas contas eram criadas por um administrador via `user.create`, que definia a senha da pessoa — o admin conhecia a senha inicial, e a senha trafegava/era digitada por quem não é o dono da conta.

Precisamos de um fluxo para a equipe administrativa onboardar novas pessoas sem que ninguém além do próprio dono defina/saiba a senha, mantendo a criação de conta sempre iniciada por um administrador.

## Decisão

Substituir `user.create` por um fluxo de **convite com link de uso único**:

1. Um administrador com permissão `manageUsers` cria um convite (`invitation.create`) informando nome, e-mail e papel. O sistema gera um token aleatório de 256 bits; **só o hash (sha256) é persistido** — o token bruto existe apenas na URL do link, devolvida uma única vez a quem criou.
2. A pessoa abre a rota pública `/convite?token=…`, vê para qual papel foi convidada e **define a própria senha**. O aceite (`invitation.accept`) cria `user` + `account` e já autentica.
3. O **papel da conta vem exclusivamente do convite** (nunca de input do aceitante). O aceite é **uso único e à prova de corrida** (`UPDATE … WHERE status = 'pending'`), com no máximo 1 convite pendente por e-mail (índice único parcial).
4. Todo caminho de aceite inválido (inexistente/expirado/usado/revogado) retorna o **mesmo erro genérico**, sem enumeração.
5. Criar/regenerar/revogar/aceitar são **auditados** ([ADR-0004](0004-auditoria-append-only.md)): `invitation.create`, `invitation.revoke`, `invitation.accept` e `user.create`.

A criação de `user`+`account` direto no banco (contornando o `signUp` do Better Auth, desligado por `disableSignUp`) é intencional e já era feita pelo antigo `user.create`; a novidade é que ocorre num endpoint público protegido pelo token de uso único, e a senha é definida pelo próprio dono.

**Restrição de papel por quem convida:** ver regra vigente na policy (`manageUsers` + limite de papel-alvo). O invariante do [ADR-0002](0002-permissoes-roles-fixas.md) — `it_admin` não acessa dados de aluno — deve ser preservado: o convite não pode ser um caminho para conceder a si mesmo um papel com acesso a dados de aluno.

## Consequências

- Nenhum administrador conhece a senha de outra pessoa; o dono a define no aceite.
- O link é um segredo portador (bearer) com TTL de 7 dias; trafega na query string, então depende de HTTPS e do `Referrer-Policy` restrito ([ADR-0006](0006-lgpd-baseline-e-deploy.md)). Regenerar invalida o link anterior.
- A criação de conta sem sessão passa a existir num endpoint público — legítima apenas mediante token válido de convite criado por um administrador.
