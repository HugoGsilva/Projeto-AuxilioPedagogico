# Especificação Funcional — Acompanhamento de Alunos com Necessidades Especiais

> Convertida do documento original (`Sistema_de_auxilio_pedagogico.pdf`) para Markdown versionado.
> As decisões de implementação derivadas desta spec estão em [`docs/adr/`](adr/) e o recorte da primeira entrega em [`docs/mvp.md`](mvp.md).

## 1. Descrição inicial do sistema

O sistema será uma plataforma destinada a apoiar a escola no registro, organização, acompanhamento e impressão dos estudos de caso de alunos com necessidades especiais. A proposta é centralizar as informações em um ambiente único, permitindo que professoras, pedagogas e administradores autorizados possam registrar, consultar e acompanhar os dados de forma segura, padronizada e auditável.

Haverá personalização do resultado do PDF final: será possível ajustar as informações que aparecem no documento gerado, como nome da escola, dados institucionais, cabeçalho, rodapé ou demais elementos necessários para adequar o documento ao uso da instituição.

A plataforma contará com controle de acesso por perfil de usuário. Os principais perfis previstos serão: **administradores** (direção e equipe de TI), **pedagogas** (acompanham e orientam os registros) e **professoras** (respondem às perguntas configuradas e documentam informações sobre os alunos).

As perguntas utilizadas no estudo de caso serão **configuráveis**, permitindo que a escola adapte o formulário conforme suas necessidades. Além das perguntas estruturadas, haverá um campo de documentação ou **relatório livre**, no qual a professora poderá registrar observações detalhadas sobre o aluno, seu desenvolvimento, dificuldades, avanços, estratégias utilizadas e demais informações relevantes.

O sistema também permitirá a geração de um documento em **PDF**, inicialmente utilizando um modelo padrão genérico. Futuramente, será estudada a possibilidade de adaptar esse PDF a um template específico da escola.

Todas as ações relevantes dentro do sistema deverão possuir **histórico para auditoria**, permitindo identificar quem criou, editou, visualizou, alterou configurações ou gerou documentos. Esse histórico é parte essencial do sistema, garantindo rastreabilidade, transparência e segurança no tratamento das informações.

## 2. Objetivo do sistema

Oferecer uma ferramenta organizada e segura para auxiliar a escola no acompanhamento de alunos com necessidades especiais, facilitando o preenchimento dos estudos de caso, a consulta das informações e a geração de documentos padronizados em PDF.

A solução busca reduzir a dependência de documentos manuais, arquivos dispersos ou registros sem controle de alteração, oferecendo um ambiente centralizado, com controle de acesso e histórico completo das ações realizadas.

## 3. Público atendido

Profissionais da escola envolvidos no acompanhamento pedagógico dos alunos com necessidades especiais.

| Perfil | Descrição |
| --- | --- |
| Administrador (Diretora) | Acesso amplo: visualiza estudos de caso, acompanha registros, consulta histórico, configura dados do PDF final e gera documentos. |
| Administrador (TI) | Apoia a administração do sistema: criação de usuários, configurações gerais e manutenção operacional. O acesso a dados sensíveis dos alunos deve ser definido conforme a política da escola. |
| Pedagoga | Acompanha os registros, orienta o preenchimento, consulta estudos de caso e apoia a análise pedagógica. |
| Professor(a) | Responde às perguntas configuradas e documenta informações sobre o aluno: observações, dificuldades, avanços e estratégias. |

## 4. Funcionalidades principais previstas

### 4.1 Login e controle de acesso

Tela de login para garantir que apenas usuários autorizados acessem as informações. Cada usuário terá um perfil definido, que determina quais funcionalidades pode acessar.

### 4.2 Permissões por perfil

Exemplo de permissões (perfis administrativos):

| Funcionalidade | Admin Diretora | Admin TI |
| --- | --- | --- |
| Acessar o sistema | Sim | Sim |
| Gerenciar usuários | Sim | Sim |
| Configurar perguntas | Sim | Sim ou limitado |
| Responder perguntas sobre o aluno | Sim, se necessário | Não |
| Escrever relatório sobre o aluno | Sim, se necessário | Não |
| Visualizar estudos de caso | Sim | A definir |
| Gerar PDF | Sim | Não |
| Configurar informações exibidas no PDF final | Sim | Sim, se autorizado |
| Consultar histórico de auditoria | Sim | Sim, se autorizado |

Exemplo de permissões (perfis pedagógicos):

| Funcionalidade | Pedagoga | Professora |
| --- | --- | --- |
| Acessar o sistema | Sim | Sim |
| Gerenciar usuários | Não ou limitado | Não |
| Configurar perguntas | Sim, se autorizado | Não |
| Responder perguntas sobre o aluno | Sim, se necessário | Sim |
| Escrever relatório sobre o aluno | Sim, se necessário | Sim |
| Visualizar estudos de caso | Sim | Apenas alunos autorizados |
| Gerar PDF | Sim | A definir |
| Configurar informações exibidas no PDF final | Não | Não |
| Consultar histórico de auditoria | Parcial ou completo | Apenas suas próprias ações, se necessário |

> Os itens "a definir" / "se autorizado" foram resolvidos com defaults conservadores — ver [ADR-0002](adr/0002-permissoes-roles-fixas.md).

### 4.3 Configuração das informações do PDF final

Poderão incluir: nome da escola, dados institucionais, cabeçalho, rodapé, informações complementares exigidas pela escola, espaços para assinatura e identificação dos responsáveis pelo preenchimento.

Essa configuração tem efeito apenas no documento final gerado em PDF, sem alterar o nome ou a identidade visual do sistema. Necessita estudo mais detalhado sobre quais informações deverão realmente ser configuráveis.

### 4.4 Configuração das perguntas

As perguntas do estudo de caso deverão ser configuráveis. O sistema poderá permitir:

- Criar, editar, ativar/desativar perguntas;
- Organizar a ordem das perguntas;
- Agrupar perguntas por tema ou seção;
- Definir obrigatoriedade (obrigatória ou opcional);
- Definir o tipo de resposta: texto curto, texto longo, múltipla escolha, data, número ou seleção.

Exemplos de seções possíveis:

| Seção | Exemplos de informações |
| --- | --- |
| Dados do aluno | Nome, turma, idade, turno, responsável |
| Informações pedagógicas | Dificuldades, habilidades, desempenho, participação |
| Necessidades específicas | Adaptações, apoio necessário, limitações observadas |
| Estratégias utilizadas | Métodos aplicados, recursos usados, intervenções |
| Evolução do aluno | Avanços, regressões, observações importantes |
| Encaminhamentos | Orientações, próximos passos, recomendações |

### 4.5 Registro do estudo de caso

Cada aluno poderá possuir um ou mais registros de estudo de caso. O estudo de caso deverá conter:

- Dados de identificação do aluno;
- Respostas às perguntas configuradas;
- Campo de observações ou relatório livre;
- Responsável pelo preenchimento;
- Datas de criação e atualização;
- Histórico completo das alterações;
- Situação do documento (ex.: rascunho, enviado, revisado, finalizado), caso a escola deseje trabalhar com etapas.

### 4.6 Documento livre da professora

Espaço para documentação textual sobre o aluno, onde a professora poderá registrar: comportamento em sala, participação nas atividades, dificuldades observadas, avanços, estratégias pedagógicas utilizadas, adaptações realizadas, relação com colegas e professores, necessidades de apoio e observações complementares.

Esse documento fará parte do estudo de caso e poderá ser incluído no PDF final.

### 4.7 Acompanhamento pela direção e pedagogas

Direção e pedagogas poderão acessar os estudos de caso para acompanhar o preenchimento, consultar informações e verificar os registros das professoras — incluindo o histórico de alterações (quando uma informação foi criada/modificada e por qual usuário).

### 4.8 Geração de PDF

O sistema deverá gerar um PDF do estudo de caso do aluno. Inicialmente com modelo padrão genérico, contendo:

- Nome da escola configurado;
- Dados do aluno e da turma;
- Perguntas e respostas preenchidas;
- Relatório descritivo da professora;
- Identificação dos responsáveis pelo preenchimento;
- Data de geração do documento;
- Espaço para assinatura, caso necessário.

## 5. Histórico e auditoria

O sistema deverá registrar as ações relevantes, permitindo acompanhar o que foi feito, quando e por qual usuário. Ações passíveis de registro:

- Login no sistema;
- Criação/alteração de usuário;
- Criação/alteração de aluno;
- Criação de estudo de caso;
- Alteração nas respostas do formulário;
- Alteração no relatório livre;
- Geração de PDF;
- Alteração nas perguntas configuráveis;
- Alteração nas informações exibidas no PDF final;
- Visualização de registros sensíveis, caso a escola considere necessário.

Para cada ação, o sistema deverá guardar:

| Informação | Descrição |
| --- | --- |
| Usuário | Quem realizou a ação |
| Data e horário | Quando a ação foi realizada |
| Tipo de ação | Criação, edição, visualização, exclusão, geração de PDF etc. |
| Registro afetado | Qual aluno, pergunta, documento ou configuração foi alterado |
| Informação anterior | Valor antes da alteração, quando aplicável |
| Informação nova | Valor depois da alteração, quando aplicável |

O histórico de auditoria não é funcionalidade secundária, mas **parte central do sistema**, considerando que ele lida com informações sensíveis de alunos.

## 6. Estrutura funcional do sistema

| Módulo | Função |
| --- | --- |
| Autenticação | Controlar login e acesso dos usuários |
| Usuários e permissões | Gerenciar perfis de administradores, pedagogas e professoras |
| Configuração das informações do PDF | Ajustar dados institucionais exibidos no documento final |
| Configuração de perguntas | Criar, editar, ordenar e ativar perguntas do estudo de caso |
| Cadastro de alunos | Organizar os alunos acompanhados pela escola |
| Estudo de caso | Registrar respostas, observações e documentos sobre cada aluno |
| Relatório livre | Permitir que professoras escrevam informações detalhadas |
| PDF | Gerar documento padronizado para impressão ou arquivamento |
| Auditoria | Registrar todas as ações relevantes realizadas no sistema |

## 7. Fluxo básico de uso

1. O usuário acessa o sistema por meio de login.
2. O administrador gerencia os usuários e permissões.
3. A direção ou equipe autorizada configura as perguntas do estudo de caso.
4. O administrador configura as informações que deverão aparecer no PDF final.
5. O aluno é cadastrado ou selecionado no sistema.
6. A professora acessa o aluno sob sua responsabilidade.
7. A professora responde às perguntas configuradas.
8. A professora escreve o relatório livre com detalhes sobre o aluno.
9. A pedagoga ou diretora acompanha e revisa as informações.
10. O sistema registra todas as ações no histórico de auditoria.
11. A direção ou usuário autorizado gera o PDF do estudo de caso.
12. O documento pode ser impresso ou arquivado pela escola.

## 8. Benefícios esperados

Organização dos estudos de caso; padronização das informações; redução de documentos manuais; facilidade de registro para professoras; melhor acompanhamento por direção e pedagogas; histórico de alterações; segurança no controle das informações; geração de PDF para impressão/arquivamento; personalização do documento final; apoio à decisão pedagógica; fortalecimento do acompanhamento de alunos com necessidades especiais.

## 9. Relevância da ação para a comunidade

A proposta apoia diretamente o acompanhamento de alunos com necessidades especiais, contribuindo para informações mais organizadas, acessíveis e confiáveis. Fortalece o trabalho de professoras, pedagogas e direção, e possui contribuição social por estar relacionada à inclusão escolar. Do ponto de vista tecnológico, representa a aplicação prática da tecnologia em uma demanda real da comunidade.
