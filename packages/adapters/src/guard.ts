export function assertMockAllowed(mode: string, providerName: string): void {
  if (process.env.NODE_ENV === "production" && mode === "mock") {
    throw new Error(
      `Refusing to start: mock provider "${providerName}" is not allowed when NODE_ENV=production.`,
    );
  }
}
