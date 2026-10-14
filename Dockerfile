# Usa uma imagem leve do Node.js (versão 20)
FROM node:20-slim

# Instala o Chromium e as fontes necessárias para o Puppeteer funcionar no Linux
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Variáveis de ambiente secretas para o Puppeteer
# Diz ao Puppeteer para não descarregar o Chrome pesado e usar o Chromium do sistema que acabámos de instalar
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Define a pasta de trabalho dentro do contentor
WORKDIR /app

# Copia os ficheiros de dependências primeiro (ajuda no cache do Docker)
COPY package*.json ./

# Instala as dependências do seu projeto
RUN npm install

# Copia o resto do código do seu projeto para o contentor
COPY . .

# Expõe a porta 3000 do Express para o Koyeb reconhecer que está online
EXPOSE 3000

# O comando exato para iniciar o bot, respeitando a sua estrutura de pastas
CMD ["node", "marcon/bot_resposta1_marcon_leiloes.cjs"]