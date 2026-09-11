export type MetricName =
  | "gift_sent_total"
  | "gift_failed_total"
  | "payment_success_total"
  | "payment_failed_total"
  | "battle_started_total"
  | "battle_completed_total"
  | "realtime_event_failures";

const counters = new Map<MetricName, number>();

export const metrics = {
  inc(name: MetricName, by = 1) {
    counters.set(name, (counters.get(name) ?? 0) + by);
  },
  get(name: MetricName): number {
    return counters.get(name) ?? 0;
  },
  snapshot(): Record<string, number> {
    return Object.fromEntries(counters.entries());
  },
  reset() {
    counters.clear();
  },
};
