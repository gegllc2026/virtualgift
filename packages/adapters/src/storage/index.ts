import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { StorageProvider } from "@gateway/core";

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";

  constructor(
    private readonly rootDir: string,
    private readonly publicUrlBase: string,
  ) {}

  async upload(key: string, body: Buffer, contentType: string): Promise<{ url: string }> {
    const full = path.join(this.rootDir, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
    void contentType;
    const url = `${this.publicUrlBase.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
    return { url };
  }

  async delete(key: string): Promise<void> {
    const full = path.join(this.rootDir, key);
    await unlink(full).catch(() => undefined);
  }
}

/**
 * S3-compatible stub — wire AWS SDK in deployment without changing core.
 */
export class S3StorageProvider implements StorageProvider {
  readonly name = "s3";

  constructor(
    private readonly config: {
      endpoint?: string;
      bucket: string;
      accessKey: string;
      secretKey: string;
      region: string;
      publicUrlBase: string;
    },
  ) {
    if (!config.bucket || !config.accessKey || !config.secretKey) {
      throw new Error("S3 storage requires bucket, access key, and secret key");
    }
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<{ url: string }> {
    // Intentionally minimal: integrate @aws-sdk/client-s3 at deploy time.
    void body;
    void contentType;
    void this.config.endpoint;
    return {
      url: `${this.config.publicUrlBase.replace(/\/$/, "")}/${key.replace(/^\//, "")}`,
    };
  }

  async delete(_key: string): Promise<void> {
    return;
  }
}
