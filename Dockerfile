FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --frozen-lockfile

COPY packages/types packages/types
COPY apps/backend apps/backend
RUN pnpm --filter backend build
RUN pnpm --filter backend exec prisma generate

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/backend/dist apps/backend/dist
COPY --from=builder /app/apps/backend/prisma apps/backend/prisma
COPY --from=builder /app/apps/backend/node_modules/.prisma apps/backend/node_modules/.prisma

EXPOSE 4000
CMD ["node", "apps/backend/dist/main"]
