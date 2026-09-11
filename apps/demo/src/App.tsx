import { useEffect, useMemo, useState } from "react";
import { createGiftingClient, type Gift } from "@gateway/sdk";
import { t, type RealtimeEvent } from "@gateway/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

type Category = { id: string; name: string; slug: string };
type BattleState = {
  id: string;
  participants: Array<{ userId: string; score: number; displayName?: string }>;
  endsAt?: string;
};

const giftEmoji: Record<string, string> = {
  rose: "🌹",
  heart: "💖",
  rocket: "🚀",
  "sports-car": "🏎️",
};

export function App() {
  const client = useMemo(() => createGiftingClient({ apiUrl: API_URL }), []);
  const [locale] = useState("en");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [viewerId, setViewerId] = useState("");
  const [creatorId, setCreatorId] = useState("");
  const [opponentId, setOpponentId] = useState("");
  const [livestreamId, setLivestreamId] = useState("");
  const [balance, setBalance] = useState(0);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | "all">("all");
  const [trayOpen, setTrayOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [feed, setFeed] = useState<string[]>([]);
  const [fx, setFx] = useState<string | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [remaining, setRemaining] = useState<string>("");

  useEffect(() => {
    let unsub: () => void = () => undefined;
    (async () => {
      try {
        const viewer = await client.login({
          externalUserId: "viewer-demo",
          username: "viewer",
          displayName: "Demo Viewer",
          role: "VIEWER",
        });
        const creator = await client.login({
          externalUserId: "creator-demo",
          username: "creator",
          displayName: "Demo Creator",
          role: "CREATOR",
        });
        // Re-login as viewer for gift sending token
        const session = await client.login({
          externalUserId: "viewer-demo",
          username: "viewer",
          displayName: "Demo Viewer",
          role: "VIEWER",
        });
        const opponentLogin = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            externalUserId: "creator-opponent",
            username: "opponent",
            displayName: "Demo Opponent",
            role: "CREATOR",
          }),
        }).then((r) => r.json());

        setViewerId((session.user as { id: string }).id);
        setCreatorId((creator.user as { id: string }).id);
        setOpponentId(opponentLogin.data.user.id);

        const live = await client.ensureLivestream({
          externalLivestreamId: "demo-channel-1",
          provider: "agora",
          hostUserId: (creator.user as { id: string }).id,
          title: "Demo Livestream",
        });
        setLivestreamId(live.livestream.id);

        const catalog = await client.getGifts();
        setGifts(catalog.gifts);
        setCategories(catalog.categories as Category[]);

        const wallet = await client.getWallet();
        setBalance(wallet.wallet.balance);

        unsub = client.connectRealtime(
          [`livestream:${live.livestream.id}`, `user:${(session.user as { id: string }).id}`],
          (event: RealtimeEvent) => {
            if (event.type === "gift.sent") {
              setFeed((f) =>
                [
                  t(locale, "gift.sent", {
                    sender: event.senderName,
                    gift: event.giftName,
                    quantity: event.quantity,
                  }),
                  ...f,
                ].slice(0, 8),
              );
              setFx(giftEmoji[event.giftName.toLowerCase()] ?? "✨");
              setTimeout(() => setFx(null), 900);
            }
            if (event.type === "wallet.updated" && event.userId === (session.user as { id: string }).id) {
              setBalance(event.balance);
            }
            if (event.type === "battle.score_updated") {
              setBattle((b) =>
                b
                  ? {
                      ...b,
                      participants: event.participants.map((p) => ({
                        userId: p.userId,
                        score: p.score,
                      })),
                    }
                  : b,
              );
            }
            if (event.type === "battle.ended") {
              setFeed((f) => [
                event.isDraw
                  ? t(locale, "battle.draw")
                  : t(locale, "battle.winner", { name: event.winnerId ?? "—" }),
                ...f,
              ]);
            }
          },
        );

        void viewer;
        setReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to bootstrap demo");
      }
    })();
    return () => unsub();
  }, [client, locale]);

  useEffect(() => {
    if (!battle?.endsAt) return;
    const timer = setInterval(() => {
      const ms = new Date(battle.endsAt!).getTime() - Date.now();
      if (ms <= 0) {
        setRemaining("00:00");
        return;
      }
      const s = Math.floor(ms / 1000);
      const mm = String(Math.floor(s / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      setRemaining(`${mm}:${ss}`);
    }, 250);
    return () => clearInterval(timer);
  }, [battle?.endsAt]);

  const visibleGifts = gifts.filter((g) => categoryId === "all" || g.categoryId === categoryId);

  const scores = useMemo(() => {
    const a = battle?.participants.find((p) => p.userId === creatorId)?.score ?? 0;
    const b = battle?.participants.find((p) => p.userId === opponentId)?.score ?? 0;
    const total = Math.max(a + b, 1);
    return {
      a,
      b,
      left: `${Math.round((a / total) * 100)}%`,
      right: `${Math.round((b / total) * 100)}%`,
    };
  }, [battle, creatorId, opponentId]);

  async function onSend(gift: Gift) {
    if (!livestreamId || !creatorId) return;
    try {
      await client.sendGift({
        giftId: gift.id,
        receiverId: creatorId,
        livestreamId,
        quantity: 1,
        battleId: battle?.id,
      });
      const wallet = await client.getWallet();
      setBalance(wallet.wallet.balance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    }
  }

  async function startPk() {
    if (!livestreamId || !creatorId || !opponentId) return;
    try {
      const created = (await client.createBattle({
        livestreamId,
        participantIds: [creatorId, opponentId],
        durationSeconds: 120,
        scoreMultiplier: 1,
      })) as { battle: BattleState & { duration: number } };
      const started = (await client.startBattle(created.battle.id)) as {
        battle: BattleState & { endTime: string | null; duration: number };
      };
      setBattle({
        id: started.battle.id,
        participants: started.battle.participants,
        endsAt: started.battle.endTime ?? undefined,
      });
      client.connectRealtime(
        [`battle:${started.battle.id}`, `livestream:${livestreamId}`, `user:${viewerId}`],
        () => undefined,
      );
      setFeed((f) => [t(locale, "battle.start"), ...f]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Battle failed");
    }
  }

  async function onRecharge() {
    try {
      const packagesRes = await fetch(`${API_URL}/api/payments/coin-packages`).then((r) =>
        r.json(),
      );
      const packages = packagesRes?.data?.packages as Array<{ id: string; name: string }> | undefined;
      const first = packages?.[0];
      if (!first) {
        setError("No coin packages configured.");
        return;
      }
      const checkout = (await client.checkout({
        coinPackageId: first.id,
        successUrl: `${window.location.origin}/?checkout=success`,
        cancelUrl: `${window.location.origin}/?checkout=cancel`,
      })) as { session?: { url?: string | null }; payment?: unknown };
      const url = checkout.session?.url;
      if (url) {
        window.location.href = url;
        return;
      }
      setError("Stripe checkout session created but no URL returned.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recharge failed");
    }
  }

  async function endPk() {
    if (!battle) return;
    await client.endBattle(battle.id);
  }

  return (
    <div className="stage">
      <div className="phone" role="application" aria-label="Livestream demo">
        <div className="live-bg" aria-hidden />
        <div className="overlay">
          <div className="top">
            <div className="host">
              <div className="avatar" aria-hidden />
              <div>
                <div className="name">Demo Creator</div>
                <div className="likes">Likes 12.4K</div>
              </div>
              <button className="follow" type="button">
                + Follow
              </button>
            </div>
            <div className="viewers">999 watching</div>
          </div>

          {battle ? (
            <>
              <div
                className="battle-bar"
                style={{ ["--left" as string]: scores.left, ["--right" as string]: scores.right }}
              >
                <div className="left">
                  {t(locale, "battle.me")} {scores.a}
                </div>
                <div className="right">
                  {scores.b} {t(locale, "battle.opponent")}
                </div>
                <div className="vs">{t(locale, "battle.vs")}</div>
              </div>
              <div className="timer">{t(locale, "battle.timer", { time: remaining || "--:--" })}</div>
            </>
          ) : null}

          <div className="status">{ready ? "Live · mock Agora" : "Connecting…"}</div>

          <div className="feed" aria-live="polite">
            {feed.map((line, i) => (
              <div className="feed-item" key={`${line}-${i}`}>
                {line}
              </div>
            ))}
          </div>

          <div className="dock">
            <button className="gift-btn" type="button" onClick={() => setTrayOpen(true)}>
              {t(locale, "gift.trayTitle")}
            </button>
            <button type="button" onClick={() => void startPk()}>
              {t(locale, "battle.start")}
            </button>
            {battle ? (
              <button type="button" onClick={() => void endPk()}>
                End
              </button>
            ) : null}
            <div className="balance" aria-label={t(locale, "wallet.balance", { balance })}>
              🪙 {balance}
            </div>
          </div>
        </div>

        {fx ? (
          <div className="fx" aria-hidden>
            <div className="fx-burst">{fx}</div>
          </div>
        ) : null}

        {trayOpen ? (
          <div className="tray" role="dialog" aria-label={t(locale, "gift.trayTitle")}>
            <h2>{t(locale, "gift.trayTitle")}</h2>
            <div className="cats">
              <button
                type="button"
                className={categoryId === "all" ? "active" : ""}
                onClick={() => setCategoryId("all")}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={categoryId === c.id ? "active" : ""}
                  onClick={() => setCategoryId(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="grid">
              {visibleGifts.map((g) => {
                const isSelected = selected === g.id;
                return (
                  <div
                    key={g.id}
                    className={`gift ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelected(g.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelected(g.id);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="icon">{giftEmoji[g.slug] ?? "🎁"}</div>
                    {isSelected ? (
                      <button className="send" type="button" onClick={() => void onSend(g)}>
                        {t(locale, "gift.send")}
                      </button>
                    ) : (
                      <div className="label">{g.name}</div>
                    )}
                    <div className="price">🪙 {g.coinCost}</div>
                  </div>
                );
              })}
            </div>
            <div className="tray-foot">
              <button type="button" onClick={() => setTrayOpen(false)}>
                Close
              </button>
              <button type="button" onClick={() => void onRecharge()}>
                {t(locale, "gift.recharge")} &gt;
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {error ? (
        <p style={{ color: "#ff8b8b", marginTop: "0.75rem", maxWidth: 420, textAlign: "center" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
