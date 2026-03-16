FROM node:20-slim

RUN npx playwright install --with-deps chromium

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY dist/ ./dist/
COPY db/migrations/ ./db/migrations/

EXPOSE 3000

CMD ["node", "dist/index.js", "--transport", "http"]
