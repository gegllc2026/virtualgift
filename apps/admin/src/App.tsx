import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { t } from "@gateway/shared";
import { api, getToken, setToken, clearToken } from "./api";

type Dash = {
  users: number;
  gifts: number;
  giftSends: number;
  payments: number;
  activeBattles: number;
};

function useAuth() {
  const [token, setTok] = useState(getToken());
  return {
    token,
    login: (tkn: string) => {
      setToken(tkn);
      setTok(tkn);
    },
    logout: () => {
      clearToken();
      setTok(null);
    },
  };
}

function Login({ onLogin }: { onLogin: (t: string) => void }) {
  const [externalUserId, setId] = useState("admin-gateway");
  const [username, setUsername] = useState("admin");
  const [displayName, setDisplayName] = useState("Gateway Admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api<{ token: string; user: { role: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          externalUserId,
          username,
          displayName,
          role: "SUPER_ADMIN",
        }),
      });
      onLogin(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <h1>
          Gateway <span style={{ color: "var(--accent)" }}>Admin</span>
        </h1>
        <p className="muted">Manage gifts, wallets, battles, and localization.</p>
        <form className="form-col" onSubmit={submit}>
          <label>
            External user ID
            <input className="input" value={externalUserId} onChange={(e) => setId(e.target.value)} />
          </label>
          <label>
            Username
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label>
            Display name
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <button className="btn" disabled={loading}>
            {loading ? t("en", "common.loading") : "Sign in"}
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </div>
    </div>
  );
}

function Shell({ onLogout, children }: { onLogout: () => void; children: React.ReactNode }) {
  const links = [
    ["/", t("en", "admin.dashboard")],
    ["/gifts", t("en", "admin.gifts")],
    ["/packages", "Coin Packages"],
    ["/battles", t("en", "admin.battles")],
    ["/users", t("en", "admin.users")],
    ["/transactions", t("en", "admin.transactions")],
    ["/settings", t("en", "admin.settings")],
  ] as const;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          Gateway <span>Gifting</span>
        </div>
        <nav className="nav">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="btn secondary" onClick={onLogout} style={{ marginTop: "auto" }}>
          Sign out
        </button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState<Dash | null>(null);
  useEffect(() => {
    void api<Dash>("/api/admin/dashboard").then(setData).catch(console.error);
  }, []);
  const cards = useMemo(
    () => [
      ["Users", data?.users],
      ["Active gifts", data?.gifts],
      ["Gifts sent", data?.giftSends],
      ["Payments", data?.payments],
      ["Active battles", data?.activeBattles],
    ],
    [data],
  );
  return (
    <>
      <div className="topbar">
        <h1>{t("en", "admin.dashboard")}</h1>
      </div>
      <div className="cards">
        {cards.map(([label, value]) => (
          <div className="card" key={String(label)}>
            <div className="label">{label}</div>
            <div className="value">{value ?? "—"}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function GiftsPage() {
  const [items, setItems] = useState<
    Array<{
      id: string;
      name: string;
      slug: string;
      coinCost: number;
      isActive: boolean;
      category?: { name: string } | null;
    }>
  >([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    coinCost: 100,
  });
  const [search, setSearch] = useState("");

  async function load() {
    const data = await api<{ items: typeof items }>(
      `/api/admin/gifts?search=${encodeURIComponent(search)}`,
    );
    setItems(data.items);
  }

  useEffect(() => {
    void load().catch(console.error);
  }, []);

  async function createGift(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/admin/gifts", {
      method: "POST",
      body: JSON.stringify({
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-"),
        coinCost: Number(form.coinCost),
        animationType: "IMAGE",
        isActive: true,
        sortOrder: 0,
      }),
    });
    setForm({ name: "", slug: "", coinCost: 100 });
    await load();
  }

  async function deactivate(id: string) {
    await api(`/api/admin/gifts/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <>
      <div className="topbar">
        <h1>{t("en", "admin.gifts")}</h1>
      </div>
      <div className="panel" style={{ marginBottom: "1rem" }}>
        <form className="form-grid" onSubmit={createGift}>
          <input
            className="input"
            placeholder="Gift name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <input
            className="input"
            type="number"
            placeholder="Coin cost"
            value={form.coinCost}
            onChange={(e) => setForm({ ...form, coinCost: Number(e.target.value) })}
            required
          />
          <button className="btn" type="submit">
            Add gift
          </button>
        </form>
      </div>
      <div className="panel">
        <div className="panel-header">
          <strong>All gifts</strong>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              className="input"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn secondary" type="button" onClick={() => void load()}>
              Search
            </button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Category</th>
              <th>Coins</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((g) => (
              <tr key={g.id}>
                <td>{g.name}</td>
                <td>{g.slug}</td>
                <td>{g.category?.name ?? "—"}</td>
                <td>{g.coinCost}</td>
                <td>
                  <span className={`badge ${g.isActive ? "" : "off"}`}>
                    {g.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  {g.isActive ? (
                    <button className="btn danger" onClick={() => void deactivate(g.id)}>
                      Deactivate
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PackagesPage() {
  const [items, setItems] = useState<
    Array<{ id: string; name: string; coinAmount: number; price: number; currency: string; isActive: boolean }>
  >([]);
  useEffect(() => {
    void api<{ packages: typeof items }>("/api/admin/coin-packages")
      .then((d) => setItems(d.packages))
      .catch(console.error);
  }, []);
  return (
    <>
      <div className="topbar">
        <h1>Coin Packages</h1>
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Coins</th>
              <th>Price (minor units)</th>
              <th>Currency</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.coinAmount}</td>
                <td>{p.price}</td>
                <td>{p.currency}</td>
                <td>
                  <span className={`badge ${p.isActive ? "" : "off"}`}>
                    {p.isActive ? "Active" : "Off"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function BattlesPage() {
  const [items, setItems] = useState<Array<{ id: string; status: string; battleType: string; duration: number }>>(
    [],
  );
  useEffect(() => {
    void api<{ items: typeof items }>("/api/admin/battles")
      .then((d) => setItems(d.items))
      .catch(console.error);
  }, []);
  return (
    <>
      <div className="topbar">
        <h1>{t("en", "admin.battles")}</h1>
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Status</th>
              <th>Duration (s)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id}>
                <td>{b.id.slice(0, 10)}…</td>
                <td>{b.battleType}</td>
                <td>{b.status}</td>
                <td>{b.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function UsersPage() {
  const [items, setItems] = useState<
    Array<{ id: string; displayName: string; role: string; wallet?: { balance: number } | null }>
  >([]);
  useEffect(() => {
    void api<{ items: typeof items }>("/api/admin/users")
      .then((d) => setItems(d.items))
      .catch(console.error);
  }, []);
  return (
    <>
      <div className="topbar">
        <h1>{t("en", "admin.users")}</h1>
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <td>{u.displayName}</td>
                <td>{u.role}</td>
                <td>{u.wallet?.balance ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TransactionsPage() {
  const [gifts, setGifts] = useState<unknown[]>([]);
  const [payments, setPayments] = useState<unknown[]>([]);
  useEffect(() => {
    void Promise.all([
      api<{ items: unknown[] }>("/api/admin/gift-transactions"),
      api<{ items: unknown[] }>("/api/admin/payments"),
    ]).then(([g, p]) => {
      setGifts(g.items);
      setPayments(p.items);
    });
  }, []);
  return (
    <>
      <div className="topbar">
        <h1>{t("en", "admin.transactions")}</h1>
      </div>
      <div className="cards">
        <div className="card">
          <div className="label">Gift sends</div>
          <div className="value">{gifts.length}</div>
        </div>
        <div className="card">
          <div className="label">Payments loaded</div>
          <div className="value">{payments.length}</div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-header">
          <strong>Recent gift transactions</strong>
        </div>
        <table>
          <thead>
            <tr>
              <th>Gift</th>
              <th>Sender</th>
              <th>Receiver</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {(gifts as Array<{
              id: string;
              totalCost: number;
              gift?: { name: string };
              sender?: { displayName: string };
              receiver?: { displayName: string };
            }>).map((row) => (
              <tr key={row.id}>
                <td>{row.gift?.name}</td>
                <td>{row.sender?.displayName}</td>
                <td>{row.receiver?.displayName}</td>
                <td>{row.totalCost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SettingsPage() {
  const [settings, setSettings] = useState<Array<{ key: string; value: unknown }>>([]);
  useEffect(() => {
    void api<{ settings: typeof settings }>("/api/admin/settings")
      .then((d) => setSettings(d.settings))
      .catch(console.error);
  }, []);
  return (
    <>
      <div className="topbar">
        <h1>{t("en", "admin.settings")}</h1>
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((s) => (
              <tr key={s.key}>
                <td>{s.key}</td>
                <td>
                  <code>{JSON.stringify(s.value)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function App() {
  const auth = useAuth();
  const nav = useNavigate();

  if (!auth.token) {
    return <Login onLogin={auth.login} />;
  }

  return (
    <Shell
      onLogout={() => {
        auth.logout();
        nav("/");
      }}
    >
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/gifts" element={<GiftsPage />} />
        <Route path="/packages" element={<PackagesPage />} />
        <Route path="/battles" element={<BattlesPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
