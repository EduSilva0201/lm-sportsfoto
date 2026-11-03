# Ambiente de teste na conta do Eduardo

Site: https://lm-sportsfoto-teste.edusilva0201.workers.dev

Configuração: `wrangler.test.jsonc`. Este ambiente usa Workers, D1 e R2 Standard.
O bucket é privado; as imagens são entregues pelo Worker em `/uploads/`.
O R2 tem franquia gratuita e cobra uso excedente.

Foram importados dois eventos, as categorias, o conteúdo do site e uma imagem.
Credenciais e sessões locais não foram importadas. O site permanece em preparação.

## Atualizar o site

Na raiz do projeto, com Wrangler conectado à conta correta:

```powershell
npm.cmd run cloudflare:build
npm.cmd exec wrangler -- deploy --config wrangler.test.jsonc
```

## Painel administrativo

O painel e as APIs administrativas estão protegidos pelo Cloudflare Access.
A aplicação configurada redireciona as três famílias de rotas administrativas para
`morning-thunder-fcf7.cloudflareaccess.com`. O domínio da equipe e a audiência
estão configurados em `wrangler.test.jsonc`.
A autorização OAuth atual do Wrangler não permite administrar as aplicações Access (API retorna 403).

No Cloudflare Zero Trust, configure uma aplicação Access por hostname para
`lm-sportsfoto-teste.edusilva0201.workers.dev`, protegendo `/admin*`, `/api/admin*`
e `/api/auth*` na mesma aplicação/audiência. Restrinja a política aos e-mails
administrativos e habilite um método de login, como código por e-mail.
Mantenha as demais rotas públicas.

Se recriar a aplicação, atualize `ACCESS_TEAM_DOMAIN` e `ACCESS_AUD` em
`wrangler.test.jsonc`, revise `ADMIN_EMAILS` e publique novamente.
Não use a senha administrativa local no ambiente publicado.

Após a configuração, valide login autorizado, bloqueio de visitantes, edição de
conteúdo, publicação de eventos e upload de imagens.

## Verificações realizadas na publicação

- Página inicial, API de saúde, conteúdo e eventos: HTTP 200.
- Catálogo remoto: dois eventos.
- Imagem importada: HTTP 200 e tipo `image/png`.
- Página inicial em modo de preparação, com `noindex, nofollow`.
- `/admin/`, `/api/admin/events` e `/api/auth/session`: redirecionamento ao Access.
- A validação de uma sessão autenticada, edição e uploads pelo painel requer login do usuário.
