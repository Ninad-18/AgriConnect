FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev || npm install

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 5000
CMD ["node", "dist/server.js"]