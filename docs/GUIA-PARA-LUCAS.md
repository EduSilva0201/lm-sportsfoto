# LM SportsFoto — domínio, Cloudflare e publicação

Este roteiro foi preparado para Lucas Martins e Eduardo. As telas podem aparecer em português ou inglês. Os nomes de domínio abaixo são exemplos, sem confirmação de disponibilidade. Nenhuma compra, criação de recurso remoto ou publicação foi feita por este guia.

## O que vamos usar

| Parte | Serviço | O que faz |
|---|---|---|
| Endereço | Registro.br para um domínio .com.br | Registro e renovação do nome do site |
| DNS | Cloudflare | Liga o endereço à hospedagem |
| Site e backend | Cloudflare Workers | Executa o site e as APIs |
| Banco de dados | Cloudflare D1 | Guarda eventos, categorias, biografia e configurações |
| Imagens enviadas | Cloudflare R2 | Guarda capas, retrato e outras imagens do painel |
| Entrada no painel | Cloudflare Access | Libera o acesso aos e-mails autorizados |

O domínio é uma compra separada da hospedagem. Para esta arquitetura não precisamos contratar hospedagem WordPress, cPanel ou VPS. O programa Node usado no computador continua sendo o ambiente local; o backend publicado é a implementação Worker que já está no projeto.

## Parte 1 — Lucas: conta e domínio

### 1. Registrar o domínio

1. Acesse https://registro.br/ e pesquise o nome desejado, por exemplo lmsportsfoto.com.br.
2. Só prossiga se o nome estiver disponível. Escolha uma alternativa com cuidado se já estiver registrado.
3. Faça o cadastro em seu nome ou no da empresa e use um e-mail ao qual terá acesso permanente.
4. Confira o valor do período de registro, o prazo e a renovação na própria tela de contratação.
5. Conclua o pagamento e as confirmações solicitadas.
6. Guarde a data de renovação e mantenha os contatos atualizados.

Não é necessário comprar um pacote de hospedagem junto do domínio. Para uma extensão .com, outra opção é pesquisar e registrar pelo Cloudflare Registrar, conforme disponibilidade da extensão e do nome.

Fontes: [Registro.br](https://registro.br/ajuda/registro-de-novos-dominios/) e [registro na Cloudflare](https://developers.cloudflare.com/registrar/get-started/register-domain/).

### 2. Criar a conta Cloudflare

1. Acesse https://dash.cloudflare.com/sign-up.
2. Cadastre-se com seu e-mail e confirme a mensagem recebida.
3. Ative a autenticação em dois fatores e guarde os códigos de recuperação.
4. Mantenha a conta e os dados de cobrança sob seu controle.

### 3. Conectar o domínio

Se o domínio foi comprado no Registro.br:

1. Na Cloudflare, escolha adicionar/conectar um domínio (Add a domain ou opção equivalente).
2. Digite apenas o domínio, sem https:// e sem /admin.
3. Escolha o plano Free de DNS para esta configuração inicial.
4. A Cloudflare mostrará dois servidores DNS, chamados nameservers. Copie os dois endereços exatos.
5. No Registro.br, abra o domínio e a opção de alterar servidores DNS.
6. Substitua pelos dois endereços fornecidos pela Cloudflare e salve.
7. Aguarde até a Cloudflare mostrar o domínio como Active/Ativo. A ativação não é necessariamente imediata.

Se comprar pelo Cloudflare Registrar, a integração de DNS já faz parte do registro; confira a ativação na conta. O valor do domínio é separado do plano Free de DNS.

Referência: [configuração da zona Cloudflare](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/).

### 4. Convidar Eduardo para configurar o projeto

1. Na conta Cloudflare, procure Manage Account / Gerenciar conta > Members / Membros.
2. Envie um convite para o e-mail Cloudflare do Eduardo.
3. Conceda as permissões necessárias ao trabalho: Workers, D1, R2, Access e configuração de DNS/domínio. Os nomes e a composição dos papéis dependem das opções exibidas na conta.
4. Eduardo aceita pelo próprio e-mail. A titularidade e a cobrança continuam com Lucas.

Não é necessário compartilhar senha, código de autenticação, cartão ou códigos de recuperação.

Referência: [membros e permissões](https://developers.cloudflare.com/fundamentals/manage-members/).

### 5. Habilitar o armazenamento R2

1. Na conta Cloudflare, entre em Storage & databases / Armazenamento e bancos de dados > R2 > Overview.
2. Se solicitado, habilite a assinatura R2 e conclua a configuração de cobrança.
3. Confira os termos e a forma de pagamento apresentados antes de confirmar.
4. Avise Eduardo quando o R2 estiver habilitado. O bucket será criado na etapa técnica.

O R2 tem uma faixa de uso mensal incluída e pode cobrar pelo consumo excedente. Não considere o projeto inteiro ilimitado por usar o plano Free de DNS. Confira [habilitação do R2](https://developers.cloudflare.com/r2/get-started/), [preços do R2](https://developers.cloudflare.com/r2/pricing/) e [preços de Workers](https://developers.cloudflare.com/workers/platform/pricing/).

### 6. Informações para enviar a Eduardo

- Domínio escolhido e confirmação de que está ativo na Cloudflare.
- Nome/ID da conta Cloudflare que será usada, para evitar configurar outra conta por engano.
- Confirmação do convite aceito e do R2 habilitado.
- E-mail do Lucas e e-mail do Eduardo que poderão administrar o site.
- Número de WhatsApp comercial com código do país e DDD.

Não envie senhas nem dados de pagamento. Lucas não precisa instalar programas no computador para depois administrar o site.

## Parte 2 — Eduardo: banco e backend no projeto existente

Execute os comandos abaixo na raiz do projeto, pelo terminal do VS Code. Use Node.js 24, conforme package.json. Se as dependências ainda não estiverem instaladas, execute npm.cmd ci.

### 7. Entrar na conta correta

~~~powershell
npm.cmd exec wrangler -- login
npm.cmd exec wrangler -- whoami
~~~

O navegador pedirá autorização. Confira a conta do Lucas. Se houver mais de uma conta disponível, acrescente account_id com o ID correto no wrangler.jsonc.

### 8. Criar o banco D1 e o bucket R2

Crie uma vez, dentro da conta correta:

~~~powershell
npm.cmd exec wrangler -- d1 create lm-sportsfoto
npm.cmd exec wrangler -- r2 bucket create lm-sportsfoto-capas
~~~

Guarde o database_id retornado pelo D1. O projeto já contém a estrutura do banco; não é necessário criar tabelas manualmente. Se os recursos já tiverem sido criados, use os existentes e confira seus nomes/IDs em vez de criar duplicatas.

O Worker precisa manter estes nomes de conexão (bindings): **DB** para D1, **UPLOADS** para R2 e **ASSETS** para os arquivos do site. Se o Wrangler oferecer alterar automaticamente o arquivo, preserve esses bindings e evite entradas duplicadas.

Referência: [D1 e bindings](https://developers.cloudflare.com/d1/get-started/).

### 9. Preparar o acesso administrativo

1. Na Cloudflare, entre em Zero Trust e configure o nome da equipe solicitado na primeira utilização.
2. Localize o domínio da equipe, no formato https://NOME-DA-EQUIPE.cloudflareaccess.com.
3. Habilite o login por código de e-mail (One-time PIN), ou um provedor de identidade já usado por Lucas.
4. Vá a Access controls > Applications e crie uma aplicação Self-hosted para o hostname escolhido.
5. Para o site público definitivo, inclua os três caminhos na MESMA aplicação: /admin*, /api/admin* e /api/auth*.
6. Crie uma política Allow limitada aos e-mails administrativos do Lucas e do Eduardo.
7. Copie a audiência da aplicação, chamada Application Audience / AUD.

Para a primeira revisão privada, use por exemplo teste.DOMINIO e proteja o hostname inteiro com essa aplicação. Assim, site e painel ficam acessíveis apenas aos e-mails autorizados. Use a audiência dessa mesma aplicação no Worker. Depois da aprovação, a configuração pública deve manter protegidos os caminhos administrativos, sem bloquear o restante do site.

A proteção deve estar pronta antes de disponibilizar o site de teste. O código do Worker também verifica a assinatura do token, a audiência, o emissor e o e-mail autorizado.

Fontes: [Cloudflare Access em Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/) e [código de e-mail](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/).

### 10. Preencher wrangler.jsonc

Substitua os valores de exemplo já existentes no arquivo:

- account_id: ID da conta do Lucas, especialmente se você participa de várias contas.
- d1_databases[0].database_id: ID real do banco.
- vars.PUBLIC_ORIGIN: endereço HTTPS completo, sem barra final.
- vars.ACCESS_TEAM_DOMAIN: domínio da equipe Access, incluindo https://.
- vars.ACCESS_AUD: audiência da aplicação.
- vars.ADMIN_EMAILS: e-mails autorizados separados por vírgula.

Acrescente a rota do domínio escolhido. Exemplo ilustrativo de CAMPOS, para integrar ao arquivo existente — não substitua o arquivo inteiro por este trecho:

~~~json
{
  "account_id": "ID_DA_CONTA_DO_LUCAS",
  "routes": [
    { "pattern": "teste.DOMINIO", "custom_domain": true }
  ],
  "vars": {
    "PUBLIC_ORIGIN": "https://teste.DOMINIO",
    "ACCESS_TEAM_DOMAIN": "https://NOME-DA-EQUIPE.cloudflareaccess.com",
    "ACCESS_AUD": "AUD_DA_APLICACAO",
    "ADMIN_EMAILS": "EMAIL_DO_LUCAS,EMAIL_DO_EDUARDO"
  }
}
~~~

Mantenha o nome do Worker lm-sportsfoto e os bindings do projeto. workers_dev e preview_urls estão desativados na configuração para domínio próprio. O Custom Domain do Worker configura a ligação do hostname ao backend; não aponte o DNS para o computador local e não crie um Worker Hello World paralelo.

Referência: [Custom Domains para Workers](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

### 11. Criar as tabelas no banco remoto

Com o database_id correto e o D1 recém-criado:

~~~powershell
npm.cmd exec wrangler -- d1 migrations apply DB --remote
~~~

Isso aplica os arquivos SQL de cloudflare/migrations ao D1. Não usa nem apaga o banco da pasta .local.

### 12. Levar os eventos e as imagens locais, se desejado

Pare o servidor local para manter a exportação consistente. Execute:

~~~powershell
npm.cmd run backup:local
npm.cmd run cloudflare:export
~~~

- .backups contém o backup privado, inclusive o cadastro administrativo. Guarde-o protegido e não envie essa pasta.
- .cloudflare-import contém os dados para migração e somente as imagens referenciadas, sem credenciais ou sessões.

Para preencher o D1 recém-criado com a exportação revisada:

~~~powershell
npm.cmd exec wrangler -- d1 execute DB --remote --file .cloudflare-import/public-data.sql
~~~

Para enviar as imagens ao R2:

~~~powershell
$imageKeys = Get-Content .cloudflare-import/uploads.json -Raw | ConvertFrom-Json
foreach ($imageKey in $imageKeys) {
  npm.cmd exec wrangler -- r2 object put "lm-sportsfoto-capas/$imageKey" --file ".cloudflare-import/uploads/$imageKey" --remote
}
~~~

Mantenha o bucket privado e o endereço r2.dev desativado. O Worker entrega as imagens públicas por /uploads/. A importação não sobrescreve registros com IDs já existentes; alterações posteriores no banco local não são sincronizadas automaticamente com o D1.

### 13. Validar e publicar o código

~~~powershell
npm.cmd test
npm.cmd run test:mobile
npm.cmd run cloudflare:check
~~~

cloudflare:check apenas compila e simula. Depois da revisão, com os recursos e Access configurados, a publicação real é feita por:

~~~powershell
npm.cmd run cloudflare:build
npm.cmd exec wrangler -- deploy
~~~

Esse último comando coloca o código no ambiente remoto. Ele ainda não foi executado neste projeto durante a preparação do guia. Não crie uma hospedagem Node em paralelo: o Worker é o backend publicado.

### 14. Testar os dois links

- Site: https://HOSTNAME-ESCOLHIDO/
- Painel: https://HOSTNAME-ESCOLHIDO/admin/

Na versão de teste privada, ambos devem pedir o acesso por e-mail. Para a versão pública, somente as áreas administrativas exigem login. A senha administrativa do computador não é usada no Access; o Lucas entra com sua identidade autorizada.

Confiram em computador e celular real: entrada do Lucas, bloqueio de e-mail não autorizado, rascunho e publicação de evento, upload de capa, textos, galeria, botão Topo, perguntas frequentes e contato. O orçamento só é enviado após confirmação do visitante no WhatsApp. A compra das fotos continua na plataforma externa; a loja interna permanece em desenvolvimento.

Antes do lançamento público, revisem imagens e textos, substituam ou ocultem depoimentos fictícios e selecionem Publicado em Busca e links. O modo Preparação apenas sinaliza que as páginas não devem ser indexadas; quem restringe visitantes é o Access.

## Custos e manutenção

O domínio é renovável. Workers, D1, Access e R2 têm condições próprias de contratação e limites; confira os planos e a cobrança exibidos na conta. Não há uma garantia de que o uso futuro será totalmente gratuito. Revisem consumo e faturas e mantenham o acesso à conta de titularidade do Lucas.

Depois de publicado, os dados alterados no painel ficam no D1/R2 remoto. O banco .local não recebe automaticamente essas alterações. Use exportações e recuperação do D1, mantenha cópias das imagens e faça backup antes de mudanças importantes. O guia técnico complementar está em cloudflare/README.md.
