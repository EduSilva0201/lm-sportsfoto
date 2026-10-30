# LM SportsFoto

Primeira versão privada para revisão de layout e navegação. Site em português, responsivo, com eventos filtráveis, galerias demonstrativas, seleção local e formulário com validação.

## Estrutura
- `dist/index.html`: estrutura das páginas e seções.
- `dist/style.css`: identidade visual e layout responsivo.
- `dist/app.js`: filtros, galerias e seleção demonstrativa no navegador.
- `dist/assets`: fotografias ilustrativas do Unsplash, não pertencentes ao Lucas. Substituir por arquivos autorizados antes da abertura comercial.

## Estado atual
Não há backend, autenticação, envio de orçamento, cobrança ou entrega de fotos. Os preços e eventos são exemplos identificados na interface. A seleção local não contém dados pessoais nem representa um pedido.

## Próximas implementações
1. Conteúdo e fotos autorizadas do Lucas; aprovação visual.
2. Backend e banco com eventos, fotos, pedidos, usuários e permissões.
3. Painel administrativo com upload direto para armazenamento privado e criação de prévias com marca-d’água.
4. Asaas: criação de cobranças no servidor, validação de webhook, idempotência e atualização segura dos pedidos.
5. Entrega autorizada por links temporários, notificações, recuperação de acesso e backups.

Segredos somente nas configurações protegidas de runtime. A marca-d’água visual desta demonstração não protege originais: em produção serão geradas prévias próprias sem exposição do original.

## Créditos das imagens demonstrativas
https://images.unsplash.com/photo-1552674605-db6ffd4facb5
https://images.unsplash.com/photo-1574629810360-7efbbe195018

## Abrir no computador

Baixe ou clone este repositório e abra `dist/index.html` no navegador. Alternativamente, com Python instalado, rode `python -m http.server 8000 --directory dist` na raiz e acesse http://localhost:8000. Não é necessário instalar dependências.

Nesta cópia no GitHub, as fotografias demonstrativas são carregadas diretamente dos endereços públicos do Unsplash e exigem conexão à internet. As fontes também usam Google Fonts. Substituiremos as imagens por arquivos autorizados do fotógrafo.

O repositório GitHub é privado. A prévia no Sites é separada e não recebe automaticamente os commits deste repositório.

## Identidade visual
Preto #101211 e verde-lima #D3F56B. Logo em SVG e favicon em dist/assets, adaptados à paleta escolhida.
