// Stats & Leaderboard page (/stats) — Task 6, built to the "Court · Stats &
// Leaderboard" design. Charts on top, global leaderboard with username search
// (done in SQL), then all 10 database views as HTML tables with CSV/PDF export.
// Everything loads via fetch (no page reloads). Guests see it read-only.
import { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import ExportButtons from '../components/ExportButtons';
import { AccuracyChart, FollowedTeamsChart } from '../components/StatsCharts';
import './StatsPage.css';

const API = '/api/stats';

async function getJson(url, signal) {
  const res = await fetch(url, { credentials: 'include', signal });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

const isAbort = (e) => e.name === 'AbortError';

function ErrorNote({ children }) {
  return <p className="stats-error" role="alert">{children}</p>;
}

function CardHead({ id, title, note }) {
  return (
    <div className="card-head">
      <h2 id={id} className="h3">{title}</h2>
      {note && <span className="card-note">{note}</span>}
    </div>
  );
}

// ---------- charts ----------
function ChartsSection({ me }) {
  const [charts, setCharts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const ctrl = new AbortController();
    getJson(`${API}/charts`, ctrl.signal)
      .then(setCharts)
      .catch((e) => !isAbort(e) && setError(e.message));
    return () => ctrl.abort();
  }, []);

  const show = (render) => {
    if (error) return <ErrorNote>{error}</ErrorNote>;
    if (!charts) return <p className="muted">Loading…</p>;
    return render();
  };

  return (
    <div className="charts-grid">
      <section className="card" aria-labelledby="acc-h">
        <CardHead id="acc-h" title="Prediction accuracy by user" note="% of picks correct" />
        <div className="chart-box">
          {show(() =>
            charts.accuracy.length > 0 ? (
              <AccuracyChart data={charts.accuracy} meId={me?.user_id} />
            ) : (
              <p className="muted">No completed games have been picked yet.</p>
            )
          )}
        </div>
      </section>
      <section className="card" aria-labelledby="fol-h">
        <CardHead id="fol-h" title="Most-followed teams" note="Followers" />
        <div className="chart-box">{show(() => <FollowedTeamsChart data={charts.mostFollowedTeams} />)}</div>
      </section>
    </div>
  );
}

// ---------- leaderboard ----------
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" aria-hidden="true" className="search-icon">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>
);

function Leaderboard({ me }) {
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const term = search.trim();

  // Re-query the backend (WHERE username ILIKE $1) 300 ms after typing stops.
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ limit: '100' });
      if (term) qs.set('search', term);
      getJson(`${API}/leaderboard?${qs}`, ctrl.signal)
        .then((data) => {
          setRows(data.rows);
          setError('');
          setLoaded(true);
        })
        .catch((e) => !isAbort(e) && setError(e.message));
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);

  return (
    <section className="card" aria-labelledby="lb-h">
      <div className="card-head wrap-row">
        <h2 id="lb-h" className="h3">Global leaderboard</h2>
        <div className="toolbar">
          <div className="search">
            <label htmlFor="lb-search" className="sr-only">Search by username</label>
            <SearchIcon />
            <input
              id="lb-search"
              type="search"
              className="input"
              placeholder="Search by username…"
              value={search}
              maxLength={30}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ExportButtons basePath={`${API}/leaderboard/export`} params={term ? { search: term } : {}} label="leaderboard" />
        </div>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="table-box">
        <table className="table">
          <thead>
            <tr>
              <th scope="col" style={{ width: 90 }}>Rank</th>
              <th scope="col">Username</th>
              <th scope="col">Correct picks</th>
              <th scope="col" className="num">Score</th>
            </tr>
          </thead>
          <tbody>
            {!loaded && !error && (
              <tr><td colSpan={4} className="empty">Loading…</td></tr>
            )}
            {rows.map((u) => {
              const you = me && u.user_id === me.user_id;
              return (
                <tr key={u.user_id} className={you ? 'is-me' : undefined}>
                  <td className={`rank ${u.rank <= 3 ? 'top' : ''}`}>#{u.rank}</td>
                  <td className="user">
                    {u.username}
                    {you && <span className="chip chip-accent">You</span>}
                  </td>
                  <td className="muted">
                    {u.completed_predictions > 0
                      ? `${u.correct_predictions} of ${u.completed_predictions}`
                      : '—'}
                  </td>
                  <td className="num score">{u.user_score}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {loaded && rows.length === 0 && term && <p className="muted no-match">No users match “{term}”.</p>}
    </section>
  );
}

// ---------- the 10 views ----------
function ViewsSection({ me }) {
  const [views, setViews] = useState([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getJson(`${API}/views`)
      .then(({ views: list }) => {
        setViews(list);
        setSelected(list[0]?.key || '');
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selected) return;
    const ctrl = new AbortController();
    getJson(`${API}/views/${selected}`, ctrl.signal)
      .then(setData)
      .catch((e) => !isAbort(e) && setError(e.message));
    return () => ctrl.abort();
  }, [selected]);

  const current = views.find((v) => v.key === selected);

  return (
    <section className="card" aria-labelledby="dv-h">
      <div className="card-head wrap-row align-end">
        <div className="stack-4">
          <h2 id="dv-h" className="h3">Database views</h2>
          <p className="muted small">Each table below is the live result of one SQL view.</p>
        </div>
        <div className="view-picker">
          <label htmlFor="dv-pick" className="label">View</label>
          <span className="sel">
            <select id="dv-pick" className="input" value={selected} onChange={(e) => {
              setSelected(e.target.value);
              setData(null);
              setError('');
            }}>
              {views.map((v) => (
                <option key={v.key} value={v.key}>{v.title}</option>
              ))}
            </select>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </span>
        </div>
      </div>

      {current && (
        <div className="view-bar">
          <p>
            <code>{current.view}</code> — {current.description}
            {data && <span className="muted"> ({data.rows.length} rows)</span>}
          </p>
          <ExportButtons basePath={`${API}/views/${selected}/export`} label={current.title} />
        </div>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}
      {!error && !data && <p className="muted">Loading…</p>}
      {data && (
        <DataTable
          columns={data.columns}
          rows={data.rows}
          isMe={(r) => me && (r.user_id === me.user_id || r.username === me.username)}
        />
      )}
    </section>
  );
}

// ---------- page ----------
export default function StatsPage() {
  const [me, setMe] = useState(null); // null = guest

  useEffect(() => {
    // /api/me needs the JWT saved at login. No token, or a 401/403, means guest.
    let token = null;
    try {
      token = localStorage.getItem('token');
    } catch {
      // storage blocked: treat as guest
    }
    if (!token) return;
    fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const u = d && (d.user ?? d);
        const id = u && (u.user_id ?? u.userId ?? u.id);
        setMe(id ? { user_id: id, username: u.username } : null);
      })
      .catch(() => setMe(null));
  }, []);

  return (
    <main className="stats-page wrap">
      <div className="stack-6">
        <h1 className="page-title">Stats &amp; Leaderboard</h1>
        <p className="subtitle">
          Season 2026–27 · updated after every final score.
          {!me && ' You’re viewing as a guest; sign up to get ranked.'}
        </p>
      </div>
      <ChartsSection me={me} />
      <Leaderboard me={me} />
      <ViewsSection me={me} />
    </main>
  );
}
