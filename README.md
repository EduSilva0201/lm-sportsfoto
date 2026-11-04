# LM SportsFoto

**🚧 Em desenvolvimento**

Projeto de site de fotografia esportiva, em desenvolvimento, para revisão de layout e navegação. Site em português, responsivo, com catálogo de eventos externos, loja própria em desenvolvimento e painel administrativo local.

## Estrutura
- `dist/index.html`: estrutura das páginas e seções.
- `dist/style.css`: identidade visual e layout responsivo.
- `dist/app.js`: filtros e conexão com a API de eventos, com prévia demonstrativa na hospedagem estática.
- `dist/assets`: logo, favicon e versões otimizadas das fotografias de Lucas Martins. Os arquivos antigos de demonstração não são usados na interface atual.

## Estado atual
O backend local possui login administrativo, banco SQLite persistente, cadastro/edição/exclusão de eventos, rascunhos, publicação e upload de capas. O catálogo consome a API quando executado pelo servidor local. A versão Cloudflare (Workers, D1 e R2) está implementada separadamente, mas ainda não foi publicada nem configurada em uma conta real.

A hospedagem estática mantém os eventos demonstrativos. A loja e o carrinho avisam que a venda direta está em desenvolvimento. Não há cobrança ou entrega de fotos pelo site. O orçamento é preparado no navegador e enviado pelo visitante via WhatsApp, após configurar o número no painel. As fotos do catálogo são de Lucas Martins; a capa provisória tem crédito abaixo.

## Rodar o projeto completo
Requer Node.js 24. Na raiz do projeto:

```sh
npm run admin:setup
npm run dev
```

Entre em http://127.0.0.1:3000/admin/ com o e-mail e a senha criados no terminal. O site está em http://127.0.0.1:3000/. O servidor aceita somente acesso local.

Dados e credenciais ficam em `.local/`, ignorada pelo Git. Não inclua essa pasta em compartilhamentos. Execute `npm test` para testar a API com banco temporário. Veja o [guia do backend](backend/README.md) para detalhes e limitações.

## Próximas implementações
1. Confirmar nomes, datas e links reais dos eventos e aprovar o painel com o Lucas.
2. Configurar domínio, D1, R2 e Cloudflare Access seguindo cloudflare/README.md, após revisar as imagens.
3. Validar o domínio publicado em aparelho real e substituir ou ocultar depoimentos demonstrativos.
4. Depois da primeira versão: integração Asaas, pedidos e entrega autorizada.

## Créditos das imagens demonstrativas
https://images.unsplash.com/photo-1552674605-db6ffd4facb5
https://images.unsplash.com/photo-1574629810360-7efbbe195018

## Abrir apenas a prévia visual

Baixe ou clone este repositório e abra `dist/index.html` no navegador. Alternativamente, com Python instalado, rode `python -m http.server 8000 --directory dist` na raiz e acesse http://localhost:8000. Não é necessário instalar dependências.

As fotografias selecionadas estão incluídas em `dist/assets`, em versões otimizadas para a web. Os originais em alta resolução permanecem fora do repositório. As fontes usam Google Fonts.

A prévia no Sites é separada e não recebe automaticamente os commits deste repositório.

## Identidade visual
Preto #101211 e verde-lima #D3F56B. Logo em SVG e favicon em dist/assets, adaptados à paleta escolhida.

## Capa provisória
A hero utiliza um recorte horizontal da fotografia de corrida de rua em Brasília publicada por basquetebol br no Pexels: https://www.pexels.com/photo/man-among-people-in-race-on-street-20037838/
Fonte original: 2667 x 4000 pixels. Versão para a hero: 2200 x 1232, WebP qualidade 90, sem desfoque ou ampliação do original.
Licença: https://www.pexels.com/license/ (consultada em 30/10/2026). Crédito exibido na hero. Esta foto não faz parte do acervo vendido pelo Lucas; a capa será substituída por fotografia própria.

O painel também permite editar os textos da hero, a biografia e as imagens do site (incluindo retrato opcional). Salve em “Conteúdo do site” e atualize a página pública. Essas alterações ficam no banco local; não modificam a prévia estática hospedada.

## Formatação no VS Code

Use a extensão recomendada **Prettier - Code formatter** (esbenp.prettier-vscode). Os arquivos HTML, CSS, JavaScript e JSON serão formatados ao salvar, com dois espaços de indentação. Para formatar pelo terminal, execute `npm.cmd run format`. Para conferir o padrão, execute `npm.cmd run format:check`. A pasta `.local` e as imagens não entram na formatação.

## Preparação para publicação e testes de celular

Foram adicionados galeria ampliável, páginas individuais de eventos, compartilhamento, filtros por local/período, perguntas frequentes e contato por WhatsApp. No painel, Contato / WhatsApp, Perguntas frequentes e Busca e links têm seus próprios menus. Visualizar antes de salvar abre uma prévia da seção sem gravar alterações. Em Depoimentos, escolha demonstração, reais ou ocultar a seção.

Veja [como testar emulando um celular](docs/TESTE-CELULAR.md) e o [guia de publicação na Cloudflare](cloudflare/README.md). Execute npm.cmd run test:mobile para gerar capturas em artifacts/mobile. O modo Preparação mantém as páginas fora da indexação; altere para Publicado no painel somente quando o conteúdo estiver pronto. A escolha e otimização das imagens continuam pendentes.

## Demonstração
<img width="1902" height="908" alt="image" src="https://github.com/user-attachments/assets/55101f8f-50a2-403d-b9bc-dfd5ef700156" /> <img width="1917" height="912" alt="image" src="https://github.com/user-attachments/assets/d32d6cd5-4975-4efa-8cb3-4ac7662279e9" />

<img width="1919" height="906" alt="image" src="https://github.com/user-attachments/assets/f36c2e41-5728-4e1c-bc41-9075772285f3" /> <img width="1916" height="902" alt="image" src="https://github.com/user-attachments/assets/275db834-cd61-481a-b99d-dc74163cfe8a" />

<img width="1919" height="906" alt="image" src="https://github.com/user-attachments/assets/cd3c5487-25d6-4384-ac69-734fb6d8730b" /> <img width="1919" height="901" alt="image" src="https://github.com/user-attachments/assets/4b67481a-a4df-4bad-9e52-312a424bbb34" />

<img width="1906" height="897" alt="image" src="https://github.com/user-attachments/assets/2540df39-103d-4a61-baac-dba6bc16b84c" /> <img width="1919" height="903" alt="image" src="https://github.com/user-attachments/assets/13c62428-39d9-4385-bbfd-7226b37c99fd" />




