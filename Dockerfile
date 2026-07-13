# syntax=docker/dockerfile:1

FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

ARG VITE_BASE_PATH=/
ARG VITE_API_URL=
ENV VITE_BASE_PATH=$VITE_BASE_PATH
ENV VITE_API_URL=$VITE_API_URL

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS server-dependencies
WORKDIR /app

# sqlite3 puede necesitar compilarse si no hay un binario precompilado para la plataforma.
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=server-dependencies /app/node_modules ./node_modules
COPY app.js package.json ./
COPY middleware ./middleware
COPY scripts ./scripts
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# El directorio se monta como volumen en Compose para conservar los datos SQLite.
RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 3001
CMD ["node", "app.js"]
