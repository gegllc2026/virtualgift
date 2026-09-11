import type { FastifyInstance } from "fastify";
import { listLocales, locales, successResponse, t, isRtlLocale } from "@gateway/shared";

export async function localeRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return successResponse({
      defaultLocale: process.env.DEFAULT_LOCALE ?? "en",
      locales: listLocales().map((code) => ({
        code,
        rtl: isRtlLocale(code),
      })),
    });
  });

  app.get("/:code", async (req) => {
    const { code } = req.params as { code: string };
    const catalog = locales[code as keyof typeof locales] ?? locales.en;
    return successResponse({
      code: locales[code as keyof typeof locales] ? code : "en",
      rtl: isRtlLocale(code),
      messages: catalog,
      sample: t(code, "gift.send"),
    });
  });
}
