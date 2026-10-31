# LM SportsFoto

**🚧 Em desenvolvimento**

Projeto de site de fotografia esportiva, em desenvolvimento, para revisão de layout e navegação. Site em português, responsivo, com catálogo de eventos externos, loja própria em desenvolvimento e painel administrativo local.

## Estrutura
- `dist/index.html`: estrutura das páginas e seções.
- `dist/style.css`: identidade visual e layout responsivo.
- `dist/app.js`: filtros e conexão com a API de eventos, com prévia demonstrativa na hospedagem estática.
- `dist/assets`: logo, favicon e versões otimizadas das fotografias de Lucas Martins. Os arquivos antigos de demonstração não são usados na interface atual.

## Estado atual
O backend local possui login administrativo, banco SQLite persistente, cadastro/edição/exclusão de eventos, rascunhos, publicação e upload de capas. O catálogo consome a API quando executado pelo servidor local. O backend ainda não foi publicado na Cloudflare.

A hospedagem estática mantém os eventos demonstrativos. A loja e o carrinho avisam que a venda direta está em desenvolvimento. Não há cobrança, entrega de fotos nem envio de orçamento. As fotos do catálogo são de Lucas Martins; a capa provisória tem crédito abaixo.

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
2. Adaptar o servidor local para Workers, D1 e R2 e configurar autenticação para produção.
3. Gestão do portfólio, fotos da loja, prévias com marca-d’água e orçamento.
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
