# Glossário (pt ↔ en)

O código é escrito em **inglês** ([ADR-0007](adr/0007-idioma-do-codigo.md)); a UI, docs e issues em **português**. Esta tabela é a fonte de verdade do vocabulário do domínio — usar sempre estes termos, sem sinônimos.

| Termo do domínio (pt) | No código (en) | Notas |
| --- | --- | --- |
| Aluno | `student` | Criança acompanhada pela escola. |
| Turma | `className` / `class_name` | Campo descritivo do aluno no MVP, não é entidade. |
| Professora | `teacher` | Perfil que preenche estudos de caso. |
| Pedagoga | `pedagogue` | Perfil que acompanha e revisa. |
| Diretora (Admin) | `director` | Perfil administrativo pleno. |
| TI (Admin) | `it_admin` | Administra usuários/configuração; sem acesso a dados de alunos. |
| Perfil / papel | `role` | Enum fixo: `director`, `it_admin`, `pedagogue`, `teacher`. |
| Atribuição (aluno↔professora) | `studentAssignment` | Autoriza a professora a ver/preencher o aluno. |
| Estudo de caso | `caseStudy` | Documento principal; um aluno pode ter vários. |
| Pergunta (configurável) | `question` | Definida pela escola; tem tipo, seção, ordem, obrigatoriedade. |
| Seção (de perguntas) | `questionSection` | Agrupamento temático das perguntas. |
| Tipo de resposta | `questionType` | `short_text`, `long_text`, `multiple_choice`, `date`, `number`, `select`. |
| Resposta | `answer` | Guarda snapshot da pergunta respondida. |
| Relatório livre | `freeReport` | Texto livre da professora dentro do estudo de caso. |
| Histórico / auditoria | `auditLog` | Tabela append-only de eventos. |
| Configuração do PDF | `pdfSettings` | Dados institucionais exibidos no documento final. |
| Geração de PDF | `pdfGeneration` | Ação auditada. |
| Responsável (pelo aluno) | `guardian` | Pai/mãe/responsável legal. |
| Turno | `shift` | Manhã/tarde/integral. |
| Necessidades especiais | `special needs` | Contexto do domínio; evitar abreviações. |
