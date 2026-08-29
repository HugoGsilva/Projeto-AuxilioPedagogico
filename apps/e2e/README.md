# Testes e2e (Playwright)

Suíte end-to-end que valida o sistema pela interface real, no navegador. Cobre o
roteiro de homologação da issue **#55**: login/logout por perfil, permissões
(ADR-0002), snapshot de perguntas (ADR-0003) e responsividade (~390px).

## Alvo

Por padrão roda contra o ambiente de **homologação** na VPS
(`https://extensao.hugogsilva.dev`) com as contas seed. Configure em `.env`
(veja `.env.example`).

## Setup

```bash
bun install                       # na raiz do monorepo
cd apps/e2e
bun run e2e:install               # baixa o Chromium do Playwright (uma vez)
cp .env.example .env              # ajuste E2E_BASE_URL / E2E_PASSWORD se preciso
```

## Rodar

```bash
cd apps/e2e
bun run test:e2e                  # leitura + permissões + responsividade
bun run test:e2e:report          # abre o último relatório HTML

# Incluir os fluxos que GRAVAM dados (criam estudo de caso no ambiente):
E2E_WRITE=1 bun run test:e2e

# Incluir o teste de snapshot (edita e reverte uma pergunta seed — global):
E2E_WRITE=1 E2E_SNAPSHOT=1 bun run test:e2e
```

## Projetos (viewports)

- **desktop** — 1280×800, roda todos os specs exceto os exclusivos de mobile.
- **mobile** — 390×844 (Pixel 7), roda `auth` e `responsive`.

## O que cada spec cobre

| Spec | Cobre |
| --- | --- |
| `smoke` | HTTPS abre, tela de login renderiza, `/` redireciona ao login |
| `auth` | login/logout dos 4 perfis, senha errada, validação de e-mail, sessão persiste no reload |
| `permissions` | navegação por papel; TI sem dados de aluno; professora só vê aluno atribuído |
| `responsive` | login usável no celular, barra inferior + menu-sanduíche, sem rolagem horizontal |
| `case-study` | *(E2E_WRITE)* criar estudo, responder obrigatória, salvar, reabrir; *(E2E_SNAPSHOT)* snapshot do enunciado |

## Notas

- Testes de escrita são **opt-in** porque gravam no ambiente compartilhado.
  Cada execução com `E2E_WRITE=1` cria um estudo de caso para a Ana Clara Souza.
- O teste de snapshot edita o enunciado de uma pergunta seed e **reverte ao
  final** (inclusive em caso de falha, via `finally`).
- Nenhum segredo é versionado: `.env` e `.auth/` (cookies de sessão) são
  ignorados pelo git.

## Rate limit do Better Auth

O `/sign-in/email` aceita ~3 tentativas por janela de ~10s (limite por rota; o
`get-session` não é afetado). Por isso:

- Só o **setup** faz login (uma vez por perfil) e salva a sessão; os demais
  specs reutilizam via `storageState` — nada de logar a cada teste.
- `loginAs` detecta o `429` e reenvia após ~12s (o timeout de teste é 90s para
  caber essa espera).
- Nenhum spec que reutiliza uma sessão salva faz **logout** — sair invalidaria o
  token compartilhado e derrubaria os testes seguintes. O logout é testado uma
  vez, com um login fresco.

## Nota de homologação (#55): dado fora do baseline

Durante a homologação, a professora aparecia vendo **Bruno Lima** — o que parecia
violar a ADR-0002. Investigado pela tela de Atribuições (como diretora): o Bruno
**está de fato atribuído** à Professora Seed em produção (o seed só atribui a Ana,
então essa atribuição extra foi criada depois, provavelmente em testes manuais).
Ou seja: **o app está correto** (filtragem server-side ok); o dado é que saiu do
baseline pretendido pelo roteiro.

Por isso o teste da professora valida o **invariante real** — "vê exatamente os
alunos atribuídos a ela", cruzando com a tela de Atribuições — em vez de cravar
nomes do seed. Assim ele passa com qualquer conjunto de atribuições e ainda pega
um vazamento de verdade (ver a mais) ou filtragem excessiva (ver a menos).

Se quiser restaurar o baseline do roteiro ("professora não vê Bruno"), remova a
atribuição Bruno→Professora em **Atribuições → Remover**.
