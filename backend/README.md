# Backend local — primeira etapa

Servidor Node.js 24 com SQLite persistente, sem dependências externas e sem conta Cloudflare. Execute os comandos na raiz do projeto. Abra a pasta no VS Code.

```sh
npm run admin:setup
npm run dev
```

O primeiro comando pede e-mail e senha (12 a 128 caracteres, sem exibir a digitação). Não existe senha padrão. Depois, abra http://127.0.0.1:3000/admin/ e entre com esse acesso. O site fica em http://127.0.0.1:3000/. Não abra o HTML diretamente para testar o backend.

## Primeiro teste

1. Cadastre um evento com nome, data, local, modalidade, plataforma e link HTTPS real do álbum.
2. Escolha uma foto existente ou envie uma capa JPG, PNG ou WebP de até 5 MB. Capas são públicas. Use prévias autorizadas, sem originais destinados à venda.
3. Salve como rascunho: ele aparece apenas no painel.
4. Edite e selecione “Publicado no site”. Atualize o site para ver o evento no catálogo. A compra abre a plataforma externa em nova aba.
5. Use “Despublicar” para retirá-lo do catálogo sem perder o cadastro. Exclusão pede confirmação.

O banco começa vazio: nenhum evento demonstrativo é inserido. A prévia estática hospedada continua com exemplos enquanto não tiver API. O catálogo conectado a esta API mostra somente eventos publicados, inclusive uma lista vazia quando não houver nenhum.

## Dados e acesso

- `.local/lm.sqlite`: banco e sessões; `.local/uploads/`: capas enviadas.
- `.local/admin.json`: e-mail, salt e hash scrypt da senha; nunca a senha original.
- `.local/` está ignorada pelo Git. Não envie seu conteúdo para o repositório ou em ZIPs de código.
- O servidor escuta apenas em `127.0.0.1`. Não exponha com túnel, proxy ou rede pública: esta versão é exclusivamente de desenvolvimento local.
- Sessões duram 8 horas, com cookie HttpOnly/SameSite=Strict, verificação de origem e limite local de tentativas de login. O cookie não usa Secure pois esta versão serve HTTP local.
- Para redefinir o administrador local: pare o servidor, remova apenas `.local/admin.json`, execute `npm run admin:setup` e apague `.local/lm.sqlite` **somente se quiser também apagar todos os eventos e sessões**. Para preservar eventos e invalidar sessões após troca de acesso, execute `node backend/revoke-sessions.mjs` antes de reiniciar.
- Para backup local, pare o servidor e copie a pasta `.local/` para um lugar protegido.
- Capas substituídas ou de eventos excluídos permanecem em disco nesta primeira etapa. Não há limpeza automática nem processamento de imagem.

## API

| Método | Rota | Uso |
|---|---|---|
| GET | `/api/health` | Estado do servidor |
| GET | `/api/events` | Eventos publicados |
| POST | `/api/auth/login` | E-mail e senha |
| GET | `/api/auth/session` | Verificar sessão |
| POST | `/api/auth/logout` | Encerrar sessão |
| GET / POST | `/api/admin/events` | Listar todos / cadastrar |
| PUT / DELETE | `/api/admin/events/:id` | Atualizar / excluir |
| POST | `/api/admin/uploads` | Corpo binário JPG/PNG/WebP |

Operações de escrita exigem origem local correta; rotas administrativas exigem cookie de sessão. Consultas usam parâmetros SQL. O orçamento é preparado no navegador para revisão e envio pelo WhatsApp. A loja, pagamentos e entrega de fotos continuam em desenvolvimento.

## Testes e próxima etapa

```sh
npm test
```

Os testes usam banco temporário isolado e verificam login, permissões, validação, publicação, persistência após reinício, upload, exclusão, logout e bloqueio por tentativas.

O ambiente local continua em Node/SQLite. A implementação separada em cloudflare/worker.mjs usa D1, R2 e validação de identidade pelo Cloudflare Access. Consulte cloudflare/README.md para configurar a conta e publicar; nenhum recurso remoto foi criado. O SQL local inicial continua em migrations/0001_events.sql.

## Editar a hero, a biografia e as imagens

No painel, abra **Conteúdo do site**. Edite os textos da hero, o nome e a história do fotógrafo. Cada imagem tem uma prévia, seletor de arquivos existentes, envio de JPG/PNG/WebP de até 5 MB, descrição acessível e enquadramento. É possível trocar o logotipo, Ícone da aba, hero, destaque do portfólio, quatro fotos do portfólio e quatro da loja. O retrato da biografia é opcional: escolha “Sem retrato” para ocultá-lo. As capas dos eventos continuam no editor de eventos.

Após enviar imagens, clique em **Salvar conteúdo** e atualize o site. O envio sozinho não publica a imagem. Ao substituir a hero provisória, atualize o crédito e seu link; o link aceita HTTPS ou pode ficar vazio. Os textos são exibidos como texto, sem executar HTML. A loja e o carrinho continuam em desenvolvimento, sem pagamentos.

As configurações são persistidas no mesmo banco local, em uma nova tabela criada pela migração aditiva 0002_site_content.sql; nenhum evento ou acesso existente é sobrescrito. As imagens continuam em .local/uploads. GET /api/content expõe somente o conteúdo público; GET/PUT /api/admin/content exigem login (PUT também exige origem local). A prévia estática não recebe as alterações do banco local.

No PowerShell, se npm.ps1 estiver bloqueado, use **npm.cmd run dev** e **npm.cmd test**. Não é necessário recriar o acesso administrativo após atualizar o código.

## Categorias de álbuns e tipos de foto

Abra **Categorias** no painel. Cadastre categorias de álbuns (por exemplo, Ciclismo) e tipos de foto (Ação, Retrato, Drone). No editor de eventos, selecione a categoria e, opcionalmente, um tipo de foto que classifica o álbum inteiro. Não há gestão de fotos individuais nesta etapa. O catálogo público oferece filtros por categoria e tipo de foto.

Renomear mantém os vínculos e atualiza os eventos. A exclusão exige confirmação e é bloqueada enquanto a categoria estiver em uso, inclusive por rascunhos. Nomes duplicados no mesmo grupo são rejeitados, ignorando maiúsculas e acentos.

A migração 0003_categories.sql adapta a tabela de eventos dentro de uma transação, copiando todos os registros e mantendo os IDs, datas, sessões, acesso e conteúdo do site. Corrida e Futebol são cadastradas inicialmente; os eventos antigos ficam sem tipo de foto. Reinicie com Ctrl+C e npm.cmd run dev e atualize o painel com Ctrl+F5.

API: GET /api/categories lista as categorias públicas. GET/POST /api/admin/categories e PUT/DELETE /api/admin/categories/:id exigem login; escritas também exigem origem local. O campo type do evento agora aceita categorias cadastradas; photo_type é opcional.

## Hero e depoimentos demonstrativos

A hero tem três fotografias com transição suave e reprodução automática a cada seis segundos, sem setas ou avanço manual. Há uma pausa discreta para acessibilidade. Cada foto pode ser trocada em Conteúdo do site. O crédito da primeira foto aparece somente no primeiro slide. Com movimento reduzido, não há transição nem avanço automático.

O site inclui seis depoimentos fictícios com imagens esportivas ilustrativas, identificados por um aviso permanente de demonstração. No painel, Depoimentos reúne nome, contexto, texto e imagem de cada cartão. Nenhuma pessoa das fotos é apresentada como autora dos depoimentos. Os dados continuam usando a tabela de conteúdo existente, sem sobrescrever as configurações já salvas.

## Navegação do painel

O painel tem um menu com Eventos e álbuns, Categorias, Hero / início, Biografia e foto, Portfólio, Imagens da loja, Depoimentos e Marca e ícone. Apenas a seção selecionada fica visível; em telas pequenas o menu aparece acima do formulário. Links como /admin/#biography abrem a seção diretamente.

Cada seção de conteúdo tem seu próprio botão de salvar. Salvar uma seção não publica alterações pendentes em outra. Ao alternar pelo menu, os valores digitados permanecem no formulário; um ponto verde indica alterações não salvas. Antes de sair ou recarregar, salve as áreas alteradas. Depoimentos são organizados em seis blocos recolhíveis. As telas de eventos e categorias mantêm seus botões próprios.

Os testes de interface usam jsdom e um servidor com banco temporário, verificando navegação, validação e salvamento independente sem acessar os dados de .local.

## Novas funções para publicação

- Eventos têm descrição opcional, página própria em /eventos/:id e API pública GET /api/events/:id. Somente publicados aparecem; rascunhos retornam 404.
- Filtros por local e intervalo de datas complementam os filtros existentes.
- Fotos do portfólio abrem uma galeria com teclado, toque e restauração de foco.
- O orçamento prepara uma mensagem no WhatsApp, sem envio automático e sem guardar dados do formulário no servidor. Configure o número no painel.
- Perguntas frequentes, SEO e modo de publicação são editáveis. Preparação adiciona noindex; Publicado remove a faixa de desenvolvimento.
- A prévia do painel usa uma janela do próprio site e mensagens restritas à mesma origem, sem gravar dados.
- /sitemap.xml inclui apenas páginas públicas. Metadados de compartilhamento são gerados no servidor, e /social/cover ou /social/:id servem a imagem existente em formato raster para os serviços de compartilhamento.
- npm.cmd run backup:local cria uma cópia íntegra do SQLite, uploads e acesso em .backups; não execute como forma de compartilhar o projeto.

Os testes usam bancos temporários. Consulte docs/TESTE-CELULAR.md para a emulação no navegador e as capturas automatizadas.
