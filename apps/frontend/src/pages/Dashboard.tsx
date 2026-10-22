import React, { useMemo } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Type mirrors from App.tsx (co-located to avoid circular deps)
// ─────────────────────────────────────────────────────────────────────────────

export interface StorageNodeSummary {
  id: string;
  name: string;
  host: string;
  port: number;
  status: string;
  isHealthy: boolean;
  capacityBytes?: number;
  usedBytes?: number;
  lastPing?: string;
}

export interface FileItemSummary {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

interface DashboardProps {
  nodes: StorageNodeSummary[];
  files: FileItemSummary[];
  onRefreshNodes: () => void;
  onNavigate: (section: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function fmtRelativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } catch {
    return '—';
  }
}

function fmtTimestamp(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function mimeShort(mime: string): string {
  if (!mime) return 'BIN';
  const parts = mime.split('/');
  return (parts[1] || parts[0]).toUpperCase().slice(0, 8);
}

// ─────────────────────────────────────────────────────────────────────────────
// System Overview stat card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'green' | 'amber' | 'red';
}) {
  const accentClass =
    accent === 'green'
      ? 'vv-db-stat--green'
      : accent === 'amber'
      ? 'vv-db-stat--amber'
      : accent === 'red'
      ? 'vv-db-stat--red'
      : '';

  return (
    <div className={`vv-db-stat ${accentClass}`}>
      <span className="vv-db-stat__label">{label}</span>
      <span className="vv-db-stat__value">{value}</span>
      {sub && <span className="vv-db-stat__sub">{sub}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Node mini-card for cluster matrix
// ─────────────────────────────────────────────────────────────────────────────

function NodeMiniCard({ node }: { node: StorageNodeSummary }) {
  const online = node.isHealthy;

  return (
    <div className={`vv-node-card ${online ? 'vv-node-card--online' : 'vv-node-card--offline'}`}>
      <div className="vv-db-node__header">
        <span className={`vv-status-dot ${online ? 'vv-status-dot--online' : 'vv-status-dot--offline'}`} />
        <span className="vv-db-node__id">{node.name || node.id}</span>
      </div>

      <span className={`vv-badge ${online ? 'vv-badge--online' : 'vv-badge--offline'}`}>
        {online ? 'Online' : 'Offline'}
      </span>

      <div className="vv-db-node__meta">
        <div className="vv-db-node__row">
          <span className="vv-db-node__key">Host</span>
          <span className="vv-db-node__val">{node.host}:{node.port}</span>
        </div>
        <div className="vv-db-node__row">
          <span className="vv-db-node__key">Last ping</span>
          <span className="vv-db-node__val">
            {node.lastPing ? fmtRelativeTime(node.lastPing) : '—'}
          </span>
        </div>
        {node.capacityBytes !== undefined ? (
          <div className="vv-db-node__row">
            <span className="vv-db-node__key">Configured capacity</span>
            <span className="vv-db-node__val">{fmtBytes(node.capacityBytes)}</span>
          </div>
        ) : (
          <div className="vv-db-node__row">
            <span className="vv-db-node__key">Storage</span>
            <span className="vv-db-node__val vv-db-node__val--dim">Usage unavailable</span>
          </div>
        )}
        <div className="vv-db-node__row">
          <span className="vv-db-node__key">Measured usage</span>
          <span className="vv-db-node__val vv-db-node__val--dim">Not exposed by current API</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Architecture facts strip (static — matches coordinator source code)
// ─────────────────────────────────────────────────────────────────────────────

const ARCH_FACTS: { key: string; val: string }[] = [
  { key: 'CIPHER',          val: 'AES-256-GCM' },
  { key: 'KEY SPLITTING',   val: 'Shamir SSS  K=3 / N=5' },
  { key: 'DATA ENCODING',   val: 'Reed–Solomon RS(3,5)' },
  { key: 'FAULT TOLERANCE', val: '2 failed nodes (N − K)' },
  { key: 'DIGEST',          val: 'SHA-256' },
];

function ArchFactsStrip() {
  return (
    <div className="vv-db-arch-strip" aria-label="Architecture specifications">
      {ARCH_FACTS.map((f) => (
        <div key={f.key} className="vv-db-arch-fact">
          <span className="vv-db-arch-fact__k">{f.key}</span>
          <span className="vv-db-arch-fact__v">{f.val}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recent Activity — derived from vault file records sorted by createdAt
// ─────────────────────────────────────────────────────────────────────────────

function RecentActivity({
  files,
  onNavigate,
}: {
  files: FileItemSummary[];
  onNavigate: (section: string) => void;
}) {
  const recent = useMemo(
    () =>
      [...files]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [files],
  );

  return (
    <div className="vv-panel vv-db-section">
      <div className="vv-db-section__header">
        <h2 className="vv-db-section__heading">Recent Activity</h2>
        <button
          className="vv-btn vv-btn--sm"
          onClick={() => onNavigate('files')}
          aria-label="View all files"
        >
          View All Files →
        </button>
      </div>

      {recent.length === 0 ? (
        <div className="vv-db-empty">
          <span className="vv-label">No vault activity recorded yet</span>
          <span className="vv-db-empty__sub">
            Files uploaded via the Upload section will appear here.
          </span>
        </div>
      ) : (
        <table
          className="vv-table vv-db-activity-table"
          aria-label="Recent vault activity"
        >
          <thead>
            <tr>
              <th>Event</th>
              <th>File</th>
              <th>Type</th>
              <th>Size</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((f) => (
              <tr key={f.id}>
                <td>
                  <span className="vv-db-act-event">
                    <span className="vv-db-act-icon" aria-hidden="true">↑</span>
                    File uploaded
                  </span>
                </td>
                <td>
                  <span className="vv-db-act-filename" title={f.filename}>
                    {f.filename.length > 32
                      ? `${f.filename.slice(0, 29)}…`
                      : f.filename}
                  </span>
                </td>
                <td>
                  <span className="vv-badge vv-badge--neutral">{mimeShort(f.mimeType)}</span>
                </td>
                <td>
                  <span className="vv-mono" style={{ fontSize: 12 }}>
                    {fmtBytes(f.sizeBytes)}
                  </span>
                </td>
                <td>
                  <span
                    className="vv-db-act-time"
                    title={fmtTimestamp(f.createdAt)}
                  >
                    {fmtRelativeTime(f.createdAt)}
                  </span>
                </td>
                <td>
                  <span className="vv-badge vv-badge--online">Distributed</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="vv-db-act-note">
        Activity derived from vault file records. The coordinator API does not expose a
        historical event stream; entries shown are confirmed distributed uploads.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard export
// ─────────────────────────────────────────────────────────────────────────────

export function Dashboard({ nodes, files, onRefreshNodes, onNavigate }: DashboardProps) {
  const healthyCount = nodes.filter((n) => n.isHealthy).length;
  const totalCount   = nodes.length;
  const offlineCount = totalCount - healthyCount;

  const clusterAccent: 'green' | 'amber' | 'red' | undefined =
    totalCount === 0     ? undefined
    : healthyCount === totalCount ? 'green'
    : healthyCount >= 3  ? 'amber'
    : 'red';

  const totalBytes = files.reduce((s, f) => s + f.sizeBytes, 0);

  const mostRecentFile = useMemo(
    () =>
      files.length === 0
        ? null
        : [...files].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )[0],
    [files],
  );

  const clusterSub =
    totalCount === 0
      ? 'Awaiting data…'
      : `${healthyCount} online · ${offlineCount} offline`;

  return (
    <>
      {/* ── Section header ─────────────────────────────────── */}
      <div className="vv-section-header">
        <span className="vv-section-title">Dashboard</span>
        <span className="vv-section-subtitle">Distributed vault overview</span>
        <button
          className="vv-btn vv-btn--sm"
          style={{ marginLeft: 'auto' }}
          onClick={onRefreshNodes}
          aria-label="Refresh node status"
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── A. System Overview ─────────────────────────────── */}
      <section aria-label="System Overview" className="vv-db-overview-section">
        <h2 className="vv-db-section__heading">System Overview</h2>
        <div className="vv-db-stats-row">
          <StatCard
            label="Storage Nodes"
            value={totalCount === 0 ? '—' : String(totalCount)}
            sub={clusterSub}
            accent={clusterAccent}
          />
          <StatCard
            label="Files Stored"
            value={String(files.length)}
            sub={
              files.length > 0
                ? `${fmtBytes(totalBytes)} total`
                : 'Vault empty'
            }
          />
          <StatCard
            label="Fault Tolerance"
            value="K=3 / N=5"
            sub="Up to 2 nodes may fail"
          />
          <StatCard
            label="Last Upload"
            value={mostRecentFile ? fmtRelativeTime(mostRecentFile.createdAt) : '—'}
            sub={mostRecentFile ? mostRecentFile.filename : 'No uploads yet'}
          />
        </div>
      </section>

      {/* Architecture specs strip */}
      <ArchFactsStrip />

      {/* ── B. Storage Cluster node matrix ─────────────────── */}
      <section aria-label="Storage Cluster" className="vv-db-section">
        <div className="vv-db-section__header">
          <h2 className="vv-db-section__heading">Storage Nodes</h2>
          <button
            className="vv-btn vv-btn--sm"
            onClick={() => onNavigate('nodes')}
            aria-label="Open Nodes monitor"
          >
            Open Node Monitor →
          </button>
        </div>

        {nodes.length === 0 ? (
          <div className="vv-db-empty">
            <div
              className="vv-loader-strip vv-loader-strip--active"
              aria-label="Fetching node data…"
            >
              01001101 10110010 00110101 11001010
            </div>
            <span className="vv-label" style={{ marginTop: 8 }}>
              Fetching node data from coordinator…
            </span>
          </div>
        ) : (
          <div className="vv-db-node-grid">
            {nodes.map((node) => (
              <NodeMiniCard key={node.id} node={node} />
            ))}
          </div>
        )}

        <p className="vv-db-telemetry-note">
          CPU · RAM · per-shard disk allocation are not exposed by the current{' '}
          <code className="vv-code">/api/nodes</code> endpoint. These are shown in the full Node
          Monitor when telemetry becomes available.
        </p>
      </section>

      {/* ── C. Recent activity ─────────────────────────────── */}
      <RecentActivity files={files} onNavigate={onNavigate} />
    </>
  );
}
