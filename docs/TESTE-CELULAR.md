# Testar como celular no Windows

## Conferir manualmente no navegador

1. No VS Code, execute **npm.cmd run dev** e abra http://127.0.0.1:3000/.
2. No Edge ou Chrome, pressione **F12** e depois **Ctrl+Shift+M**.
3. No seletor superior, escolha um celular ou use **Responsive** com largura de **390** e altura de **844**.
4. Atualize a página. Teste também larguras de 360 e 412 pixels e a orientação horizontal.
5. Toque no menu, encontre um evento, use os filtros e abra seus detalhes. Confira Compartilhar, Copiar link e a indicação da plataforma externa.
6. Toque em uma foto do portfólio: use as setas ou deslize para o lado. Feche a galeria e confira se o foco volta à foto.
7. Expanda as dúvidas. No contato, preencha os campos e prepare a mensagem. O envio só acontece quando você confirma no WhatsApp.
8. Abra /admin/, entre com seu acesso e teste as seções. Altere um texto, toque em Visualizar antes de salvar e confira a prévia. Feche e salve apenas se quiser publicar aquela alteração local.

Para testar o contato, configure o número real em **Contato / WhatsApp** no painel, usando código do país e DDD, somente números. Sem número configurado, o formulário explica que o contato ainda não está disponível e não simula envio.

## Testes automáticos e capturas

Execute **npm.cmd run test:mobile**. O teste usa Microsoft Edge instalado, cria um banco temporário e verifica 360×800, 390×844, 412×915, 768×1024 e 1366×900. Não usa o seu login nem grava no seu banco. As informações e o número usados são demonstrativos; nenhuma mensagem é enviada.

As capturas ficam em **artifacts/mobile/** e o relatório em **artifacts/mobile/report.json**. O teste verifica menu, filtros, galeria, dúvidas, orçamento, páginas dos eventos, painel, prévia, animação automática/pausa, erros JavaScript e ausência de rolagem horizontal.

Se você usa Chrome em vez de Edge, no PowerShell execute:

~~~powershell
$env:LM_BROWSER_CHANNEL = 'chrome'
npm.cmd run test:mobile
~~~

A emulação ajusta tela, toque e comportamento móvel no Chromium. Não substitui um teste em aparelho real nem comprova o comportamento do Safari no iPhone. As capturas usam dados demonstrativos e bloqueiam recursos externos para manter o teste independente.

Referências: [emulação no Edge](https://learn.microsoft.com/en-us/microsoft-edge/devtools/device-mode) e [emulação no Playwright](https://playwright.dev/docs/emulation).
