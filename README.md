# Bot de imagens de gift cards PSN: WhatsApp → Telegram

Lê **somente imagens novas** de **um grupo específico** do WhatsApp e envia ao seu Telegram sequências de 12 caracteres com formato compatível com vouchers da PlayStation.

> Projeto educativo / protótipo não oficial. `whatsapp-web.js` automatiza o WhatsApp Web e pode apresentar falhas ou gerar restrições de conta. Use apenas em grupo com permissão para esse monitoramento. O reconhecimento OCR não comprova que um voucher é válido.

## Requisitos

- Windows, Linux ou macOS, Node.js **20.9+** e internet.
- Conta de WhatsApp participante do grupo e Telegram.
- O PC precisa permanecer ligado e conectado para receber imagens em tempo real.
- A primeira inicialização do OCR pode precisar baixar dados de idioma.

## 1. Instalar

Abra a pasta do projeto em um terminal do VS Code e execute:

```bash
npm install
```

Copie `.env.example` para `.env` no Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

## 2. Criar bot Telegram e obter o Chat ID

1. Abra https://t.me/BotFather, envie `/newbot` e copie o token.
2. Abra `.env` e defina `TELEGRAM_BOT_TOKEN`.
3. Abra o seu bot recém-criado e envie `/start`.
4. Execute `npm run telegram:id`.
5. Copie o ID exibido para `TELEGRAM_CHAT_ID`.

Não divulgue o token nem publique o arquivo `.env`.

## 3. Identificar o grupo WhatsApp

Execute:

```bash
npm run grupos
```

No celular: WhatsApp > Configurações > Dispositivos conectados > Conectar dispositivo. Leia o QR Code do terminal.

O terminal listará os grupos e seus IDs. Copie o ID exato do grupo desejado para `WHATSAPP_GROUP_ID` no `.env`.

A sessão é preservada localmente em `.wwebjs_auth/`. **Não publique, compartilhe ou envie essa pasta a terceiros.**

## 4. Iniciar

```bash
npm start
```

Envie uma **imagem** ao grupo monitorado com o texto fictício `ABCD-EFGH-JKLM`. O bot tentará ler os caracteres e enviará uma mensagem ao seu Telegram.

Mensagens comuns de texto, imagens em outros grupos, vídeos e áudios não são analisados. As imagens não são armazenadas: o histórico local registra IDs de mensagens e códigos encontrados para não repetir alertas.

## 5. Testar OCR sem conectar ao WhatsApp

```bash
npm run teste:imagem -- "C:\\caminho\\minha-imagem.png"
```

Isso permite ajustar as imagens de teste antes de autenticar o WhatsApp.

## 6. Testar regras dos códigos

```bash
npm test
```

## Observações e limitações

- Códigos PSN devem ter **12 caracteres**; o reconhecimento aceita sequências separadas em grupos de 4 ou sem separação. Reconhecer o formato **não confirma que o voucher seja válido**.
- OCR pode trocar `O` por `0`, `I` por `1` e similares. Revise a imagem original antes de resgatar.
- Para não reenviar códigos repetidos, este projeto persiste um arquivo `data/historico.json` localmente (até 1.000 IDs e códigos). Se ele for removido, o histórico de alertas é perdido.
- Caso a API do Telegram falhe ao entregar, a imagem **não é marcada como processada**, mas o protótipo não possui retentativa automática: você precisará reenviar a imagem ou adicionar uma fila persistente de tentativas.
- `whatsapp-web.js` é uma implementação não oficial; alterações no WhatsApp Web podem quebrar o bot. Não existe garantia de acesso contínuo ao grupo.
- A API oficial de WhatsApp Business não oferece acesso geral a grupos pessoais; para isso seria necessário alterar o canal de entrada ou aceitar limitações de uma solução não oficial.
- Quando reiniciar, o bot volta a monitorar **novas mensagens** e não faz varredura retroativa no histórico.

## Arquivos principais

- `src/index.js`: autenticação, filtro por ID, eventos WhatsApp, fila de processamento
- `src/ocr.js`: Tesseract e pré-processamento com Sharp
- `src/codigos.js`: extração de sequências de 12 caracteres
- `src/telegram.js`: envio privado do código por Telegram
- `src/historico.js`: deduplicação persistente
- `src/telegram-id.js`: auxiliar para descobrir seu Chat ID
- `src/testar-imagem.js`: testa o OCR isoladamente
- `tests/codigos.test.js`: testes unitários de reconhecimento do formato

## Privacidade

O texto completo extraído via OCR não é salvo nem transmitido ao Telegram. São enviados somente possíveis códigos; outros dados de imagem são tratados localmente em memória. Convém garantir a permissão do grupo para monitoramento automatizado. Não exponha seu bot, token, histórico de códigos ou sessão do WhatsApp.

## Configuração e testes neste Windows

O `.env` já foi criado com exemplos. Substitua os três valores pelos seus dados; não envie o token no chat.

O comando `npm` deste computador apontava para um `npm-cli.js` ausente em AppData. O auxiliar local contorna esse problema sem alterar sua instalação global:

```powershell
.\npm-local.ps1 install
.\npm-local.ps1 test
```

Você também pode executar o bot diretamente com Node, sem depender desse comando:

1. Execute `node src/index.js --listar-grupos`.
2. No WhatsApp do celular, abra **Dispositivos conectados > Conectar dispositivo** e escaneie o QR Code que aparece no terminal.
3. Espere a lista de grupos. Copie o ID do grupo escolhido, por exemplo `120363123456789012@g.us`, para `WHATSAPP_GROUP_ID` no `.env`. Este é o ID pedido pelo projeto: não é seu telefone, o nome do grupo, o link de convite nem o QR Code. Grupos antigos também podem ter um hífen no ID.
4. Crie seu bot em https://t.me/BotFather com `/newbot` e coloque o token em `TELEGRAM_BOT_TOKEN`.
5. Abra a conversa com seu próprio bot e envie `/start`. Execute `node src/telegram-id.js`; copie o ID da sua conversa para `TELEGRAM_CHAT_ID`. Se houver várias pessoas na lista, escolha a sua. Se não aparecer, envie uma nova mensagem ao bot e tente novamente. Um webhook configurado em outro sistema impede `getUpdates`; use um bot dedicado ou remova o webhook no sistema responsável.
6. Execute `node src/index.js` e aguarde `WhatsApp conectado!`.
7. Envie uma imagem legível com `ABCD-1234-EFGH` ao grupo configurado. Imagens enviadas pela própria conta conectada também são analisadas. Anexos enviados como documento não são analisados.
8. Confira o alerta no Telegram. Repetir o mesmo código não deve gerar outro alerta. Para testar novamente, use outro código fictício de 12 caracteres.
9. Use `Ctrl+C` para parar. Mantenha o terminal e o computador funcionando durante o monitoramento.

Para testar uma imagem local:

```powershell
node src/testar-imagem.js "C:\caminho\imagem.png"
```

Para executar todos os testes, incluindo OCR real (o primeiro uso pode baixar o idioma):

```powershell
$env:TESTAR_OCR = '1'
node --test
Remove-Item Env:TESTAR_OCR
```

Os testes usam requisições simuladas para o Telegram e mensagens simuladas para o WhatsApp: não enviam alertas reais. Cobrem filtros, mensagens próprias, deduplicação, falhas de envio, mídia indisponível, limite de tamanho, persistência/limite do histórico, validação do `.env`, reconhecimento OCR real, imagem vazia e arquivo inválido. A autenticação pelo QR e a entrega real precisam ser verificadas com suas contas seguindo os passos acima.

Limitações identificadas na análise: o formato de 12 caracteres pode gerar falsos positivos; não verifica saldo ou validade na PSN; falhas não têm retentativa automática; a fila é mantida em memória; o histórico é local e pressupõe uma única instância do bot. Não execute dois processos simultâneos usando a mesma sessão.

Auditoria das dependências em 04/11/2026: npm audit apontou 16 alertas (5 moderados e 11 altos), na cadeia de dependências do whatsapp-web.js. A correção sugerida para a maioria exige trocar para uma versão anterior fora da faixa declarada; essa alteração não foi aplicada automaticamente. Os testes funcionais não comprovam ausência de vulnerabilidades.


Validação local concluída: 23 testes aprovados com TESTAR_OCR=1, incluindo OCR real; navegador Puppeteer iniciou e encerrou corretamente (Chrome 146). Autenticação e entrega entre contas reais permanecem pendentes do preenchimento do .env e leitura do QR Code pelo usuário.

