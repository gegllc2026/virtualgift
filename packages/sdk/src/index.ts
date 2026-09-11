import { io, type Socket } from "socket.io-client";
import type { RealtimeEvent } from "@gateway/shared";

export type GiftingClientOptions = {
  apiUrl: string;
  token?: string;
  realtimeUrl?: string;
};

export type Gift = {
  id: string;
  name: string;
  slug: string;
  coinCost: number;
  iconUrl: string | null;
  animationUrl: string | null;
  animationType: string;
  categoryId: string | null;
};

function idempotencyKey(prefix = "sdk"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export class GiftingClient {
  private token: string | undefined;
  private socket: Socket | null = null;
  private readonly apiUrl: string;
  private readonly realtimeUrl: string;

  constructor(opts: GiftingClientOptions) {
    this.apiUrl = opts.apiUrl.replace(/\/$/, "");
    this.realtimeUrl = (opts.realtimeUrl ?? opts.apiUrl).replace(/\/$/, "");
    this.token = opts.token;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const res = await fetch(`${this.apiUrl}${path}`, { ...init, headers });
    const json = (await res.json()) as { success: boolean; data?: T; error?: { message: string } };
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
    }
    return json.data as T;
  }

  async login(input: {
    externalUserId: string;
    username: string;
    displayName: string;
    avatar?: string | null;
    role?: string;
  }) {
    const data = await this.request<{ token: string; user: unknown }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    this.token = data.token;
    return data;
  }

  async getGifts(categoryId?: string) {
    const q = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : "";
    return this.request<{ gifts: Gift[]; categories: unknown[] }>(`/api/gifts${q}`);
  }

  async getWallet() {
    return this.request<{ wallet: { balance: number; currency: string } }>("/api/wallet");
  }

  async ensureLivestream(input: {
    externalLivestreamId: string;
    provider?: string;
    hostUserId?: string;
    title?: string;
  }) {
    return this.request<{ livestream: { id: string } }>("/api/livestreams/ensure", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async sendGift(input: {
    giftId: string;
    receiverId: string;
    livestreamId: string;
    quantity?: number;
    battleId?: string;
    idempotencyKey?: string;
  }) {
    return this.request("/api/gifts/send", {
      method: "POST",
      body: JSON.stringify({
        ...input,
        quantity: input.quantity ?? 1,
        idempotencyKey: input.idempotencyKey ?? idempotencyKey("gift"),
      }),
    });
  }

  async createBattle(input: {
    livestreamId: string;
    participantIds: string[];
    durationSeconds?: number;
    scoreMultiplier?: number;
  }) {
    return this.request("/api/battles", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async startBattle(battleId: string) {
    return this.request(`/api/battles/${battleId}/start`, { method: "POST", body: "{}" });
  }

  async endBattle(battleId: string) {
    return this.request(`/api/battles/${battleId}/end`, { method: "POST", body: "{}" });
  }

  async checkout(input: {
    coinPackageId: string;
    successUrl: string;
    cancelUrl: string;
    idempotencyKey?: string;
  }) {
    return this.request("/api/payments/checkout", {
      method: "POST",
      body: JSON.stringify({
        ...input,
        idempotencyKey: input.idempotencyKey ?? idempotencyKey("pay"),
      }),
    });
  }

  connectRealtime(channels: string[], onEvent: (event: RealtimeEvent) => void) {
    this.socket?.disconnect();
    this.socket = io(this.realtimeUrl, {
      transports: ["websocket", "polling"],
      auth: this.token ? { token: this.token } : undefined,
    });
    this.socket.on("connect", () => {
      for (const ch of channels) this.socket?.emit("join", ch);
    });
    this.socket.on("gateway.event", (event: RealtimeEvent) => onEvent(event));
    return () => {
      this.socket?.disconnect();
      this.socket = null;
    };
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export function createGiftingClient(opts: GiftingClientOptions) {
  return new GiftingClient(opts);
}

export { idempotencyKey };
