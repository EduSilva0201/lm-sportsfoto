# Publicação na Cloudflare

O código está preparado para **Workers + D1 + R2**, com painel protegido pelo **Cloudflare Access**. Nada foi publicado e nenhum recurso remoto foi criado durante a implementação. O ambiente Node/SQLite continua funcionando como antes.

## O que vai para cada serviço

- Workers: site, páginas de eventos e API.
- D1: eventos, categorias e textos/configurações do site.
- R2: capas e outras imagens enviadas pelo painel.
- Access: entrada administrativa por identidade autorizada, sem copiar a senha local.

O banco .local/lm.sqlite e o arquivo .local/admin.json não são incluídos no pacote publicado. O build copia apenas o site e os três arquivos públicos do painel. O Worker valida a assinatura, emissor, audiência e e-mail do token do Access; não basta enviar um cabeçalho com o e-mail.

## Conferir antes de criar recursos

Na raiz do projeto:

~~~powershell
npm.cmd test
npm.cmd run test:mobile
npm.cmd run cloudflare:check
~~~

O último comando apenas compila e simula a publicação. Não publica. No painel local, revise conteúdo e links, configure Contato / WhatsApp e use a prévia. A revisão das imagens continua pendente. Em Depoimentos, mantenha o aviso de demonstração ou oculte a seção até ter depoimentos reais autorizados. Em Busca e links, o modo Preparação mantém a faixa de desenvolvimento e sinaliza que as páginas não devem ser indexadas; mude para Publicado quando estiver pronto.

## Configuração na sua conta (etapa futura)

Você precisará ter um domínio na Cloudflare e estar autenticado no Wrangler. Estes comandos são para o momento da publicação; não foram executados remotamente:

~~~powershell
npm.cmd exec wrangler -- login
npm.cmd exec wrangler -- d1 create lm-sportsfoto
npm.cmd exec wrangler -- r2 bucket create lm-sportsfoto-capas
~~~

Edite wrangler.jsonc:

1. Substitua database_id pelo ID retornado ao criar o D1.
2. Informe PUBLIC_ORIGIN com seu domínio HTTPS, sem barra no final.
3. Informe ACCESS_TEAM_DOMAIN com https://SUA-EQUIPE.cloudflareaccess.com.
4. Informe ACCESS_AUD com a audiência da aplicação Access.
5. Informe ADMIN_EMAILS com o e-mail autorizado (ou uma lista separada por vírgulas).
6. Acrescente uma rota de domínio próprio: routes: [{ pattern: 'fotos.seudominio.com.br', custom_domain: true }], usando JSON válido com aspas duplas.

workers_dev e preview_urls permanecem desativados. O domínio próprio será a entrada do site.

No Zero Trust, crie uma aplicação Access para seu domínio com os caminhos **/admin***, **/api/admin*** e **/api/auth*** na mesma aplicação/audiência. Restrinja a política aos e-mails administrativos. O restante do site deve continuar público. Configure o login por código de e-mail ou seu provedor de identidade. O painel publicado entra pelo Access; a senha do painel local continua sendo usada somente no computador.

Sem as configurações do Access, o Worker retorna acesso indisponível e não libera o painel. O teste local do Worker permite conferir o site e a API pública, mas não substitui a validação do login no domínio real após configurar o Access.

## Levar os dados locais sem levar credenciais

Pare o servidor local durante a exportação e faça primeiro um backup:

~~~powershell
npm.cmd run backup:local
npm.cmd run cloudflare:export
~~~

O backup em .backups é privado e inclui o acesso administrativo; não deve ser enviado ao repositório ou à hospedagem. A exportação em .cloudflare-import contém somente categorias, eventos, textos e imagens referenciadas. Não exporta sessões nem credenciais.

Depois de revisar a exportação, no banco remoto recém-criado:

~~~powershell
npm.cmd exec wrangler -- d1 migrations apply DB --remote
npm.cmd exec wrangler -- d1 execute DB --remote --file .cloudflare-import/public-data.sql
~~~

A importação não sobrescreve registros com IDs já existentes. Para levar as imagens referenciadas ao R2, no PowerShell:

~~~powershell
$imageKeys = Get-Content .cloudflare-import/uploads.json -Raw | ConvertFrom-Json
foreach ($imageKey in $imageKeys) {
  npm.cmd exec wrangler -- r2 object put "lm-sportsfoto-capas/$imageKey" --file ".cloudflare-import/uploads/$imageKey" --remote
}
~~~

O bucket deve ficar privado, sem habilitar r2.dev; o Worker serve as imagens públicas em /uploads/. Não envie o arquivo admin.json ou o banco SQLite para o R2.

## Publicar somente depois da revisão

Depois de configurar domínio, D1, R2 e Access, revisar as imagens e aprovar o conteúdo:

~~~powershell
npm.cmd run cloudflare:build
npm.cmd exec wrangler -- deploy
~~~

Confirme no domínio real: site público, login do Access, bloqueio de visitantes no painel, publicação/rascunho de um evento de teste, envio de capa, contato e compartilhamento. Teste também em um celular físico. A configuração real da conta, DNS, certificados, política do Access e comportamento das plataformas externas só podem ser validados nessa etapa.

## Simulador local do Worker

~~~powershell
npm.cmd run cloudflare:migrate:local
npm.cmd run cloudflare:dev
~~~

Abra http://localhost:8787/. Os dados ficam em .wrangler, separados de .local. As rotas administrativas permanecem bloqueadas sem um token válido do Access. Para editar e testar o painel local, continue usando npm.cmd run dev em http://127.0.0.1:3000/.

## Continuidade dos dados publicados

O D1 tem recursos de recuperação e exportação; ative e confira a retenção disponível na sua conta. Antes de alterações importantes, exporte o D1 com wrangler d1 export DB --remote --output .backups/backup-d1.sql e guarde em local privado fora do versionamento. Mantenha uma cópia das imagens enviadas. O backup local não inclui alterações feitas depois no ambiente publicado.

Referências oficiais: [Static Assets](https://developers.cloudflare.com/workers/static-assets/), [D1](https://developers.cloudflare.com/d1/), [R2](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/) e [validação do Access](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/).
