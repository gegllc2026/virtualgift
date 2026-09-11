import {
  AgoraLivestreamAdapter,
  AgoraRtmRealtimeProvider,
  LocalStorageProvider,
  MockLivestreamProvider,
  MockPaymentProvider,
  MockRealtimeProvider,
  S3StorageProvider,
  StripePaymentProvider,
  SocketRealtimeProvider,
  assertMockAllowed,
} from "@gateway/adapters";
import type {
  LivestreamProvider,
  PaymentProvider,
  RealtimeProvider,
  StorageProvider,
} from "@gateway/core";

export type AppProviders = {
  payment: PaymentProvider;
  realtime: RealtimeProvider;
  livestream: LivestreamProvider;
  storage: StorageProvider;
};

export function buildProviders(): AppProviders {
  const mode = process.env.PROVIDERS_MODE ?? "mock";
  if (mode === "mock") {
    assertMockAllowed(mode, "all-mocks");
  }

  const payment: PaymentProvider =
    mode === "live"
      ? new StripePaymentProvider(
          process.env.STRIPE_SECRET_KEY ?? "",
          process.env.STRIPE_WEBHOOK_SECRET ?? "",
        )
      : new MockPaymentProvider();

  const realtimeChoice = process.env.REALTIME_PROVIDER ?? (mode === "mock" ? "mock" : "socket");
  let realtime: RealtimeProvider;
  if (realtimeChoice === "agora-rtm") {
    realtime = new AgoraRtmRealtimeProvider(
      process.env.AGORA_APP_ID ?? "",
      process.env.AGORA_APP_CERTIFICATE ?? "",
    );
  } else if (realtimeChoice === "socket") {
    // Replaced with live Socket.IO instance after server listen.
    realtime = new SocketRealtimeProvider({
      to: () => ({ emit: () => undefined }),
    });
  } else {
    realtime = new MockRealtimeProvider();
  }

  const livestream: LivestreamProvider =
    mode === "live" && process.env.AGORA_APP_ID
      ? new AgoraLivestreamAdapter(
          process.env.AGORA_APP_ID,
          process.env.AGORA_APP_CERTIFICATE ?? "",
          realtime,
        )
      : new MockLivestreamProvider();

  const storage: StorageProvider =
    process.env.STORAGE_PROVIDER === "s3"
      ? new S3StorageProvider({
          endpoint: process.env.STORAGE_ENDPOINT,
          bucket: process.env.STORAGE_BUCKET ?? "",
          accessKey: process.env.STORAGE_ACCESS_KEY ?? "",
          secretKey: process.env.STORAGE_SECRET_KEY ?? "",
          region: process.env.STORAGE_REGION ?? "us-east-1",
          publicUrlBase: process.env.STORAGE_PUBLIC_URL ?? "",
        })
      : new LocalStorageProvider(
          process.env.STORAGE_LOCAL_DIR ?? "./uploads",
          process.env.STORAGE_PUBLIC_URL ?? "http://localhost:3001/uploads",
        );

  return { payment, realtime, livestream, storage };
}
