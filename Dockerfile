FROM node:20-alpine AS frontend-builder
WORKDIR /frontend

COPY basic-statuspage/package*.json ./
RUN npm install --package-lock=false
COPY basic-statuspage/ .

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM node:20-alpine AS backend-builder
WORKDIR /backend

COPY v2/package*.json ./
RUN npm install --omit=dev --package-lock=false
COPY v2/src ./src

FROM node:20-alpine
WORKDIR /app/v2

ENV NODE_ENV=production

COPY --from=backend-builder /backend/node_modules ./node_modules
COPY --from=backend-builder /backend/src ./src
COPY v2/package*.json ./
COPY config /app/config
COPY --from=frontend-builder /frontend/dist ./public

ENV STATIC_ASSETS_DIR=/app/v2/public
ENV API_PREFIX=/api

EXPOSE 2000

CMD ["node", "src/index.js"]
