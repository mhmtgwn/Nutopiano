FROM node:20-alpine AS base
WORKDIR /app

# Workspace manifests
COPY package*.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci

COPY backend ./backend

WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
