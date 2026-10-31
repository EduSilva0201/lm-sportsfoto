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

Operações de escrita exigem origem local correta; rotas administrativas exigem cookie de sessão. Consultas usam parâmetros SQL. O formulário de orçamento, a loja, pagamentos e entrega de fotos ainda não têm backend.

## Testes e próxima etapa

```sh
npm test
```

Os testes usam banco temporário isolado e verificam login, permissões, validação, publicação, persistência após reinício, upload, exclusão, logout e bloqueio por tentativas.

SQLite foi escolhido por usar SQL compatível com a base do D1. Isso não torna este servidor Node um Worker: a próxima etapa é adaptar as rotas para Cloudflare Workers, trocar o acesso SQLite pela API D1, levar as capas ao R2 e configurar autenticação, HTTPS, limites e segredos para produção. O SQL inicial está versionado em `migrations/0001_events.sql`.
