import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { Server as SocketServer } from "socket.io";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./db.js";
import { buildProviders } from "./providers.js";
import { registerRoutes } from "./routes/index.js";
import { AppError, errorResponse, ERROR_CODES } from "@gateway/shared";
import { metrics } from "@gateway/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      redact: ["req.headers.authorization", "body.password", "body.token"],
    },
  });

  const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:5174")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
  });
  await app.register(helmet, { global: true });
  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 200),
    timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
  });
  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? "dev-only-change-me",
  });
  await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });

  const uploadDir = path.resolve(process.env.STORAGE_LOCAL_DIR ?? "./uploads");
  await app.register(fastifyStatic, {
    root: uploadDir,
    prefix: "/uploads/",
    decorateReply: false,
  });

  const providers = buildProviders();

  // Attach Socket.IO to the same HTTP server after listen prep
  let io: SocketServer | null = null;

  app.decorate("prisma", prisma);
  app.decorate("providers", providers);
  app.decorate("getIo", () => io);

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send(errorResponse(err.code, err.message, err.details));
    }
    if ((err as { validation?: unknown }).validation) {
      return reply
        .status(400)
        .send(errorResponse(ERROR_CODES.VALIDATION_ERROR, "Validation failed.", err));
    }
    app.log.error({ err }, "Unhandled error");
    return reply
      .status(500)
      .send(errorResponse(ERROR_CODES.INTERNAL_ERROR, "Internal server error."));
  });

  await registerRoutes(app);

  app.get("/health", async () => ({
    ok: true,
    providersMode: process.env.PROVIDERS_MODE ?? "mock",
    metrics: metrics.snapshot(),
  }));

  const port = Number(process.env.PORT ?? 3001);
  await app.listen({ port, host: "0.0.0.0" });

  io = new SocketServer(app.server, {
    cors: { origin: corsOrigins, credentials: true },
  });

  io.on("connection", (socket) => {
    socket.on("join", (channel: string) => {
      if (typeof channel === "string" && channel.length < 200) {
        void socket.join(channel);
      }
    });
    socket.on("leave", (channel: string) => {
      if (typeof channel === "string") void socket.leave(channel);
    });
  });

  // Hot-swap socket realtime if configured
  if (providers.realtime.name === "socket.io" || process.env.REALTIME_PROVIDER === "socket") {
    const { SocketRealtimeProvider } = await import("@gateway/adapters");
    providers.realtime = new SocketRealtimeProvider(io);
  }

  app.log.info(`API listening on :${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

declare module "fastify" {
  interface FastifyInstance {
    prisma: typeof prisma;
    providers: ReturnType<typeof buildProviders>;
    getIo: () => SocketServer | null;
  }
}
