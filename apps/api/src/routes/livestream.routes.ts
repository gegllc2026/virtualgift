import type { FastifyInstance } from "fastify";
import { successResponse } from "@gateway/shared";
import { authenticate } from "../auth.js";

export async function livestreamRoutes(app: FastifyInstance) {
  app.post("/ensure", { preHandler: authenticate }, async (req) => {
    const body = req.body as {
      externalLivestreamId: string;
      provider?: string;
      hostUserId?: string;
      title?: string;
    };

    const session = await app.providers.livestream.resolveSession(body.externalLivestreamId);

    const livestream = await app.prisma.livestream.upsert({
      where: {
        provider_externalLivestreamId: {
          provider: body.provider ?? session.provider,
          externalLivestreamId: body.externalLivestreamId,
        },
      },
      create: {
        externalLivestreamId: body.externalLivestreamId,
        provider: body.provider ?? session.provider,
        hostUserId: body.hostUserId,
        title: body.title,
        status: session.status,
        metadata: (session.metadata ?? {}) as object,
      },
      update: {
        hostUserId: body.hostUserId,
        title: body.title,
        status: session.status,
      },
    });

    return successResponse({ livestream, session });
  });

  app.get("/:id", { preHandler: authenticate }, async (req) => {
    const { id } = req.params as { id: string };
    const livestream = await app.prisma.livestream.findUnique({ where: { id } });
    return successResponse({ livestream });
  });
}
