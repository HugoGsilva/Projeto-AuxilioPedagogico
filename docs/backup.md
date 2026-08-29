# Backup diário criptografado off-site (ADR-0006)

O serviço `backup` do stack (`deploy/portainer-stack.yml`) roda todo dia, no
horário `BACKUP_HOUR_UTC` (padrão 06:00 UTC ≈ 03:00 de Brasília):

1. `pg_dump -Fc` do banco pela rede interna (nenhuma porta pública);
2. criptografa com `openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt`
   usando a `BACKUP_PASSPHRASE`;
3. envia para o object storage S3-compatível fora do VPS via `rclone`
   (`auxilio_pedagogico_<UTC>.dump.enc`);
4. apaga do bucket arquivos com mais de `BACKUP_RETENTION_DAYS` (padrão 30).

O serviço **se recusa a subir** enquanto os `TROCAR_*` não forem preenchidos —
deploy com placeholder aparece como falha no Portainer, nunca como backup falso.

## Configurar o storage (uma vez)

1. Crie um bucket em um provedor S3-compatível **fora do VPS**. Recomendação:
   Cloudflare R2 (egress gratuito facilita o teste de restore periódico);
   alternativa: Backblaze B2. Atenção LGPD: dados sensíveis de crianças —
   registre a região/residência do bucket na decisão do time.
2. Gere uma credencial de API S3 restrita ao bucket.
3. No Portainer, edite o stack e preencha:
   - `BACKUP_PASSPHRASE`: frase longa e aleatória (ex.: `openssl rand -base64 32`).
     **Guarde fora do VPS** (gerenciador de senhas da escola) — sem ela o
     backup é irrecuperável.
   - `BACKUP_REMOTE_PATH`: `remote:<nome-do-bucket>/auxilio-pedagogico`.
   - `RCLONE_CONFIG_REMOTE_ENDPOINT` / `ACCESS_KEY_ID` / `SECRET_ACCESS_KEY`.
4. Faça o redeploy do stack.

## Verificar que está funcionando

- `docker service logs <stack>_backup -f` → esperar `[backup] SUCESSO ...`.
- O healthcheck fica **unhealthy** no Portainer se passar 36h sem sucesso.
- No bucket: um arquivo novo por dia, nomes ordenáveis por data.

## Restaurar (runbook)

Testado ponta a ponta em 2026-08-29 (dump → criptografa → descriptografa →
restore em banco novo → contagens idênticas). Use a mesma ordem:

1. Baixe o arquivo desejado do bucket (console web ou
   `rclone copy remote:<bucket>/auxilio-pedagogico/<arquivo>.dump.enc .`).
2. Descriptografe (pede a `BACKUP_PASSPHRASE`):

   ```sh
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
     -in arquivo.dump.enc -out arquivo.dump
   ```

3. Restaure primeiro em um banco **novo** — nunca por cima do banco real sem
   validar antes:

   ```sh
   createdb -h <host> -U postgres auxilio_pedagogico_restore_check
   pg_restore -h <host> -U postgres -d auxilio_pedagogico_restore_check \
     --no-owner --no-privileges arquivo.dump
   ```

4. Valide contagens-chave comparando com o esperado:

   ```sql
   select 'user', count(*) from "user"
   union all select 'student', count(*) from student
   union all select 'case_study', count(*) from case_study
   union all select 'answer', count(*) from answer
   union all select 'audit_log', count(*) from audit_log;
   ```

5. Só então promova, com a API **parada** no Portainer (scale 0 do serviço
   `api`). Duas opções — copie o comando inteiro:

   **Opção A — restaurar por cima do banco real** (destrutivo; só depois da
   validação do passo 4):

   ```sh
   pg_restore -h <host> -U postgres -d auxilio_pedagogico \
     --clean --if-exists --no-owner --no-privileges arquivo.dump
   ```

   **Opção B — troca por renomeação** (mantém o banco antigo como
   `_old` até confirmar que tudo funciona):

   ```sql
   -- conectado ao banco postgres, sem sessões abertas nos dois bancos:
   alter database auxilio_pedagogico rename to auxilio_pedagogico_old;
   alter database auxilio_pedagogico_restore_check rename to auxilio_pedagogico;
   ```

   Depois, suba a API de volta (scale 1) e faça um login de verificação.
6. Apague o banco de validação (opção A: `dropdb -h <host> -U postgres
   auxilio_pedagogico_restore_check`; opção B: mantenha o `_old` por alguns
   dias e então `dropdb auxilio_pedagogico_old`).

## Teste periódico de restore

O ADR-0006 exige restore **testado periodicamente**: repetir o runbook acima a
cada 3 meses (proposta inicial — ajustável pelo time) com o backup mais
recente, registrando o resultado em uma linha do `docs/diario-de-bordo.md`.

## Limitações conhecidas

- Sem alerta ativo (e-mail/chat) em falha — a visibilidade é o healthcheck no
  Portainer e o log do serviço. Registrado como risco aceito para o tamanho da
  operação.
- A passphrase fica no stack do Portainer (env) — mesmo modelo dos demais
  segredos do ambiente; proteger o acesso ao Portainer é pré-requisito.
