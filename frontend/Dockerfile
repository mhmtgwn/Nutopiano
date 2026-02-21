FROM node:20-alpine AS base
WORKDIR /app

# Workspace manifests
COPY package*.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json

RUN npm ci

COPY frontend ./frontend

WORKDIR /app/frontend
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start", "--", "-p", "3000"]
