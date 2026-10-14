# 🤖 Bot de Monitoramento de Lances (WhatsApp)

Um bot automatizado em Node.js usando `whatsapp-web.js` para monitorar um grupo específico do WhatsApp. Ele identifica mensagens que contenham a frase "lance inicial livre" (ignorando formatações, letras maiúsculas ou caracteres invisíveis) e responde automaticamente com um valor pré-definido.

## 🚀 Funcionalidades

* **Monitoramento Direcionado:** Escuta apenas mensagens de um Grupo de WhatsApp específico (via `GRUPO_ID`).
* **Filtro Inteligente de Texto:** Normaliza o texto para contornar formatações ocultas, negrito, itálico e espaços falsos antes de buscar pelos termos-chave.
* **Auto-Resposta:** Envia instantaneamente uma resposta configurável (ex: "1") ao identificar um anúncio válido.
* **Sistema de Logs:** Registra todas as mensagens analisadas e suas classificações (POSITIVO/NEGATIVO) em um arquivo local `mensagens.log`.
* **Fila de Processamento:** Evita banimentos e sobrecarga do WhatsApp processando as mensagens sequencialmente de forma segura.
* **Mecanismo de Proteção:** Pausa a execução automaticamente em caso de falha de envio para evitar flood ou instabilidade.

## 🛠️ Instalação

1. Certifique-se de ter o [Node.js](https://nodejs.org/) instalado em sua máquina (versão 14+ recomendada).
2. Salve o código principal em um arquivo chamado `index.js`.
3. Inicie o projeto e instale as dependências necessárias executando os comandos abaixo no seu terminal:

```bash
npm init -y
npm install whatsapp-web.js qrcode-terminal express