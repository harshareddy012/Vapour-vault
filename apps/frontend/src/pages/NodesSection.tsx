import React, { useState, useEffect, useRef, useMemo } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StorageNode {
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

interface NodesSectionProps {
  nodes: StorageNode[];
  onRefreshNodes: () => Promise<void> | void;
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

function fmtTimestamp(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function fmtRelativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 5) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  } catch {
    return '—';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main NodesSection Component
// Refined: unwanted CPU/RAM/network telemetry removed; live activity moved to global terminal
// ─────────────────────────────────────────────────────────────────────────────

export function NodesSection({ nodes, onRefreshNodes }: NodesSectionProps) {
  const [togglingNodeId, setTogglingNodeId] = useState<string | null>(null);
  const [toggleErrors, setToggleErrors] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const previousHealthStates = useRef<Record<string, boolean>>({});
  const [transitioningNodes, setTransitioningNodes] = useState<Record<string, boolean>>({});

  // Detect state changes to trigger brief transition blink
  useEffect(() => {
    const changed: Record<string, boolean> = {};
    let hasChanges = false;

    nodes.forEach((node) => {
      const prev = previousHealthStates.current[node.id];
      if (prev !== undefined && prev !== node.isHealthy) {
        changed[node.id] = true;
        hasChanges = true;
      }
      previousHealthStates.current[node.id] = node.isHealthy;
    });

    if (hasChanges) {
      setTransitioningNodes((prev) => ({ ...prev, ...changed }));
      const timer = setTimeout(() => {
        setTransitioningNodes((prev) => {
          const next = { ...prev };
          Object.keys(changed).forEach((k) => delete next[k]);
          return next;
        });
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [nodes]);

  // Derived cluster statistics
  const totalCount = nodes.length;
  const onlineCount = nodes.filter((n) => n.isHealthy).length;
  const offlineCount = totalCount - onlineCount;

  const clusterStatus = useMemo(() => {
    if (totalCount === 0) {
      return { label: 'CONNECTING', badge: 'vv-badge--neutral', desc: 'Awaiting cluster response…' };
    }
    if (onlineCount === totalCount) {
      return { label: 'HEALTHY', badge: 'vv-badge--online', desc: 'All storage nodes online. Full K=3/N=5 redundancy active.' };
    }
    if (onlineCount >= 3) {
      return {
        label: 'DEGRADED',
        badge: 'vv-badge--warn',
        desc: `${onlineCount} nodes online (>= K=3 threshold). Reconstruction available, redundancy reduced.`,
      };
    }
    return {
      label: 'CRITICAL OUTAGE',
      badge: 'vv-badge--offline',
      desc: `Only ${onlineCount} node${onlineCount === 1 ? '' : 's'} online (< K=3 threshold). Key reconstruction impossible!`,
    };
  }, [totalCount, onlineCount]);

  // ───────────────────────────────────────────────────────────────────────────
  // Manual Node Refresh Action
  // ───────────────────────────────────────────────────────────────────────────
  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefreshNodes();
    } finally {
      setIsRefreshing(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Node Simulator Toggle Action
  // ───────────────────────────────────────────────────────────────────────────
  const handleToggle = async (nodeId: string, currentlyHealthy: boolean) => {
    if (togglingNodeId) return; // Prevent duplicate requests
    setTogglingNodeId(nodeId);
    setToggleErrors((prev) => ({ ...prev, [nodeId]: '' }));

    const targetOnline = !currentlyHealthy;

    try {
      const res = await fetch(`/api/simulator/toggle/${nodeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: targetOnline }),
      });

      if (res.ok) {
        // Await real refresh from API before considering state settled
        await onRefreshNodes();
      } else {
        let errMsg = `Toggle failed (HTTP ${res.status})`;
        try {
          const errJson = await res.json();
          errMsg = errJson.error || errMsg;
        } catch {
          /* ignore */
        }
        setToggleErrors((prev) => ({ ...prev, [nodeId]: errMsg }));
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Toggle request failed';
      setToggleErrors((prev) => ({ ...prev, [nodeId]: errMsg }));
    } finally {
      setTogglingNodeId(null);
    }
  };

  return (
    <div className="vv-nodes-page">
      {/* ── Section Header ─────────────────────────────────────────── */}
      <div className="vv-section-header">
        <div>
          <span className="vv-section-title">Nodes</span>
          <span className="vv-section-subtitle">
            Distributed storage cluster inventory &amp; failure simulator
          </span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            id="vv-nodes-refresh-btn"
            className="vv-btn vv-btn--sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing || togglingNodeId !== null}
            aria-label="Refresh node health"
          >
            {isRefreshing ? '↻ Polling…' : '↻ Refresh Nodes'}
          </button>
        </div>
      </div>

      {/* ── 1. Cluster Overview ────────────────────────────────────── */}
      <section aria-label="Cluster Overview" className="vv-nodes-overview-strip">
        <div className="vv-nodes-stat-card">
          <span className="vv-nodes-stat-label">TOTAL NODES</span>
          <div className="vv-nodes-stat-main">
            <span className="vv-nodes-stat-value vv-text-code">{totalCount}</span>
            <span className="vv-nodes-stat-sub">5 registered topology</span>
          </div>
        </div>

        <div className="vv-nodes-stat-card">
          <span className="vv-nodes-stat-label">NODE STATUS BREAKDOWN</span>
          <div className="vv-nodes-status-breakdown">
            <div className="vv-nodes-breakdown-row">
              <span className="vv-status-dot vv-status-dot--online" />
              <span className="vv-nodes-breakdown-text">
                <strong className="vv-text-green">{onlineCount}</strong> Online
              </span>
            </div>
            <div className="vv-nodes-breakdown-row">
              <span className="vv-status-dot vv-status-dot--offline" />
              <span className="vv-nodes-breakdown-text">
                <strong className="vv-text-red">{offlineCount}</strong> Offline
              </span>
            </div>
          </div>
        </div>

        <div className="vv-nodes-stat-card">
          <span className="vv-nodes-stat-label">CLUSTER HEALTH STATUS</span>
          <div style={{ marginTop: 2 }}>
            <span className={`vv-badge ${clusterStatus.badge}`}>{clusterStatus.label}</span>
            <div className="vv-nodes-stat-desc">{clusterStatus.desc}</div>
          </div>
        </div>

        <div className="vv-nodes-stat-card">
          <span className="vv-nodes-stat-label">FAULT TOLERANCE THRESHOLD</span>
          <div className="vv-nodes-stat-main">
            <span className="vv-nodes-stat-value vv-text-code">K=3 / N=5</span>
            <span className="vv-nodes-stat-sub">Max 2 node failures tolerated</span>
          </div>
        </div>
      </section>

      {/* ── 2. Five Storage Node Cards with Failure Simulation ─────── */}
      <section aria-label="Storage Nodes Matrix">
        <div className="vv-nodes-section-title-row">
          <h3 className="vv-nodes-section-heading">Storage Node Inventory</h3>
          <span className="vv-text-muted" style={{ fontSize: 11, fontFamily: 'var(--vv-font-mono)' }}>
            Polling interval: 5000ms · Real-time simulation via coordinator proxy
          </span>
        </div>

        {nodes.length === 0 ? (
          <div className="vv-panel" style={{ padding: 24, textAlign: 'center' }}>
            <p className="vv-text-muted" style={{ fontSize: 13, fontFamily: 'var(--vv-font-mono)' }}>
              01001101 10110010 00110101 11001010
            </p>
            <p className="vv-label" style={{ marginTop: 8 }}>
              Querying storage nodes from coordinator /api/nodes…
            </p>
          </div>
        ) : (
          <div className="vv-nodes-grid">
            {nodes.map((node) => {
              const isToggling = togglingNodeId === node.id;
              const isTransitioning = !!transitioningNodes[node.id];
              const err = toggleErrors[node.id];
              const configuredCap = node.capacityBytes ? fmtBytes(node.capacityBytes) : '10.00 GB';

              return (
                <div
                  key={node.id}
                  id={`vv-node-card-${node.id}`}
                  className={`vv-node-detail-card ${
                    node.isHealthy
                      ? 'vv-node-detail-card--online'
                      : 'vv-node-detail-card--offline'
                  } ${isTransitioning ? 'vv-node-detail-card--transition' : ''}`}
                >
                  {/* Card Header */}
                  <div className="vv-node-detail-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        className={`vv-status-dot ${
                          node.isHealthy ? 'vv-status-dot--online' : 'vv-status-dot--offline'
                        }`}
                      />
                      <div>
                        <span className="vv-node-detail-name">{node.name}</span>
                        <span className="vv-node-detail-id">[{node.id}]</span>
                      </div>
                    </div>
                    <span
                      className={`vv-badge ${
                        node.isHealthy ? 'vv-badge--online' : 'vv-badge--offline'
                      }`}
                    >
                      {node.isHealthy ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>

                  {/* Node Address & Network Info */}
                  <div className="vv-node-detail-body">
                    <div className="vv-kv-row">
                      <span className="vv-kv-key">Network address</span>
                      <span className="vv-kv-val vv-text-code" style={{ fontSize: 11 }}>
                        {node.host}:{node.port}
                      </span>
                    </div>

                    <div className="vv-kv-row">
                      <span className="vv-kv-key">Heartbeat / Ping</span>
                      <span
                        className="vv-kv-val vv-mono"
                        style={{ fontSize: 11 }}
                        title={node.lastPing || 'No ping recorded'}
                      >
                        {node.lastPing ? `${fmtRelativeTime(node.lastPing)} (${fmtTimestamp(node.lastPing)})` : 'Live session'}
                      </span>
                    </div>

                    <div className="vv-kv-row">
                      <span className="vv-kv-key">Configured capacity</span>
                      <span className="vv-kv-val vv-mono" style={{ fontSize: 11 }}>
                        {configuredCap} <span className="vv-text-muted" style={{ fontSize: 10 }}>(Configured)</span>
                      </span>
                    </div>

                    <div className="vv-kv-row">
                      <span className="vv-kv-key">Measured storage usage</span>
                      <span className="vv-kv-val vv-text-muted" style={{ fontSize: 10, fontStyle: 'italic' }}>
                        Usage unavailable — not measured by current API
                      </span>
                    </div>

                    <div className="vv-kv-row">
                      <span className="vv-kv-key">Shard payload storage</span>
                      <span className="vv-kv-val vv-text-code" style={{ fontSize: 10 }}>
                        storage/{node.id}/
                      </span>
                    </div>
                  </div>

                  {/* Simulator Controls */}
                  <div className="vv-node-detail-footer">
                    <button
                      type="button"
                      id={`vv-toggle-${node.id}`}
                      className={`vv-btn vv-btn--sm ${
                        node.isHealthy ? 'vv-btn--danger' : 'vv-btn--primary'
                      } vv-node-toggle-btn`}
                      disabled={isToggling || togglingNodeId !== null}
                      onClick={() => handleToggle(node.id, node.isHealthy)}
                    >
                      {isToggling ? (
                        <>
                          <span className="vv-nodes-btn-pulse" />
                          Applying…
                        </>
                      ) : node.isHealthy ? (
                        'Simulate Offline'
                      ) : (
                        'Restore Online'
                      )}
                    </button>
                  </div>

                  {/* Inline Error if Toggle Fails */}
                  {err && (
                    <div className="vv-msg vv-msg--err" style={{ marginTop: 8, fontSize: 11 }}>
                      <strong>Simulator Error:</strong> {err}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
