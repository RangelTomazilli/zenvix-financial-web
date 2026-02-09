# Zenvix Controle Financeiro Familiar

Aplicação web para organizar finanças domésticas com foco em compartilhamento entre membros de uma mesma família. O projeto foi construído com Next.js (App Router) e Supabase como backend-as-a-service, oferecendo autenticação, CRUD de receitas/despesas, dashboard de indicadores e gestão de categorias/membros.

## Principais funcionalidades
- Autenticação via Supabase Auth (e-mail/senha já pronto para OAuth).
- Contas familiares com múltiplos usuários compartilhando os mesmos dados.
- Dashboard com saldo consolidado, totais mensais, evolução histórica e distribuição por categoria.
- CRUD completo de transações (receitas e despesas) com categorização.
- Gestão de categorias personalizadas separadas por tipo (receita ou despesa).
- Convites por e-mail, com token de aceitação e controle de expiração, além de remoção de membros.
- APIs protegidas por Supabase JWT e consumo via rotas da App Router.

## Stack
- [Next.js 16](https://nextjs.org/) (App Router, Server Components)
- [React 19](https://react.dev/)
- [Supabase](https://supabase.com/) (Auth + PostgreSQL)
- [Tailwind CSS 4](https://tailwindcss.com/) (estilos utilitários)
- [Zod](https://zod.dev/) para validação
- [date-fns](https://date-fns.org/) para formatação de datas

## Pré-requisitos
- Node.js 20+
- Conta no Supabase e um projeto provisionado
- npm (ou pnpm/yarn/bun, mas os scripts foram pensados em npm)

## Configuração do Supabase
1. Crie um projeto no Supabase e copie as chaves `Project URL`, `anon key` e `service_role key`.
2. Execute o SQL do arquivo [`supabase/schema.sql`](supabase/schema.sql) no editor SQL do Supabase (ou via CLI) para criar tabelas, policies e funções necessárias.
3. Em *Authentication → Providers*, mantenha e-mail/senha ativado (outros provedores são opcionais).

> O trigger `handle_new_user` mantém a tabela `profiles` sincronizada com `auth.users`. Se preferir gerenciar manualmente, remova o bloco correspondente do `schema.sql` e ajuste o fluxo de cadastro.

## Variáveis de ambiente
Copie o arquivo `.env.example` para `.env.local` e preencha os valores:

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` – URL do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – chave pública (anon).
- `SUPABASE_KEY` – chave de serviço (role) usada apenas no servidor.
- `NEXT_PUBLIC_APP_URL` – URL base da aplicação (ex.: `http://localhost:3000`).
- `NEXT_PUBLIC_LOG_LEVEL` – nível mínimo para os logs (`debug`, `info`, `warn`, `error`).
- `RESEND_API_KEY` – chave da plataforma [Resend](https://resend.com/) para envio de e-mails (opcional em desenvolvimento).
- `RESEND_FROM_EMAIL` – endereço remetente utilizado nos convites.
- `FAMILY_INVITE_TTL_DAYS` – validade padrão (em dias) dos convites enviados.
- `NEXT_PUBLIC_FAMILY_INVITE_TTL_DAYS` – mesma validade exposta no cliente para feedback visual.
- `SUPABASE_ACCESS_TOKEN` – (opcional) token pessoal para executar `supabase db push`, atualizar templates de e-mail etc. sem precisar informar no comando.

## Instalação e execução
```bash
npm install
npm run dev
```
O app ficará disponível em `http://localhost:3000`.

### Scripts úteis
- `npm run dev` – ambiente local de desenvolvimento.
- `npm run build` – build de produção.
- `npm run start` – executa o build em modo produção.
- `npm run lint` – checa o código com ESLint.

## Convites por e-mail

1. Usuários administradores (papel `owner`) podem enviar convites na tela `/family`. O backend gera um token e envia o link `https://seuapp.com/invite/<token>` para o e-mail informado.
2. O convidado pode abrir o link autenticado ou não:
   - Não autenticado: as ações de "Entrar" e "Criar conta" preservam o token (`redirect=/invite/<token>?autoAccept=1`). Após autenticar, o convite é aceito automaticamente.
   - Autenticado: aparece o painel com botões "Aceitar" ou "Recusar". O aceite vincula o usuário à família e redireciona para `/dashboard`.
3. O token expira conforme `FAMILY_INVITE_TTL_DAYS`. Há uma função auxiliar para expirar convites pendentes (`public.expire_family_invites()`), podendo ser agendada via [Supabase Scheduled Triggers](https://supabase.com/docs/guides/platform/cron-jobs):

```sql
select public.expire_family_invites();
```

Configure um job (por exemplo, diária) para executar o SQL acima usando a role `service_role`.

## Confirmação de cadastro por e-mail

- O Supabase Auth envia o e-mail de verificação usando o template localizado em [`src/email/templates/confirm-signup.html`](src/email/templates/confirm-signup.html).  
- Para aplicá-lo no projeto:
  1. Abra o arquivo e copie o HTML completo.
  2. No dashboard do Supabase vá em **Authentication → Templates → Confirm signup**.
  3. Cole o conteúdo e salve as alterações.
- Se quiser automatizar, utilize a [Management API](https://supabase.com/docs/guides/api#management-api) com o `SUPABASE_ACCESS_TOKEN`, enviando a requisição `PUT /v1/projects/<PROJECT_REF>/auth/templates/confirm_signup` com o conteúdo do arquivo.
- Após o cadastro, o usuário é redirecionado ao `/login` com um aviso em destaque orientando a confirmar o e-mail antes de acessar o painel.

## Estrutura de pastas
```
src/
  app/
    (auth)/        # Rotas públicas (login/cadastro)
    (protected)/   # Dashboard, transações, categorias e família
    api/           # Rotas de API protegidas via Supabase
  components/      # Componentes reutilizáveis (UI, formulários, etc.)
  context/         # Providers e hooks de sessão
  data/            # Repositórios de acesso ao Supabase
  lib/             # Utilitários (Supabase, logger, validações)
  types/           # Tipagens compartilhadas
  utils/           # Helpers de formatação
supabase/
  schema.sql       # Script SQL para provisionar o banco
```
