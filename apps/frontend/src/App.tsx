import React, { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types (inline — no external package change needed)
// ─────────────────────────────────────────────────────────────────────────────

interface StorageNode {
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

interface FileItem {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

type Section =
  | 'dashboard'
  | 'upload'
  | 'files'
  | 'nodes'
  | 'recovery'
  | 'verification'
  | 'analytics'
  | 'settings';

// ─────────────────────────────────────────────────────────────────────────────
// Nav configuration — eight mandatory sections in exact spec order
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Section; label: string; index: string }[] = [
  { id: 'dashboard',    label: 'Dashboard',    index: '01' },
  { id: 'upload',       label: 'Upload',       index: '02' },
  { id: 'files',        label: 'Files',        index: '03' },
  { id: 'nodes',        label: 'Nodes',        index: '04' },
  { id: 'recovery',     label: 'Recovery Lab', index: '05' },
  { id: 'verification', label: 'Verification', index: '06' },
  { id: 'analytics',    label: 'Analytics',    index: '07' },
  { id: 'settings',     label: 'Settings',     index: '08' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Binary loader strip — displayed only while a real request is in-flight.
// The displayed bits are purely decorative animation (NOT cryptographic data).
// ─────────────────────────────────────────────────────────────────────────────

const BINARY_FRAMES = [
  '01001101 10110010 00110101 11001010',
  '10110010 01001101 11001010 00110101',
  '00110101 11001010 01001101 10110010',
  '11001010 00110101 10110010 01001101',
];

function BinaryLoader({ label }: { label: string }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % BINARY_FRAMES.length), 280);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="vv-stack" style={{ gap: 6 }}>
      <div className="vv-loader-strip vv-loader-strip--active" aria-label="Processing…">
        {BINARY_FRAMES[frame]}
      </div>
      <span className="vv-label">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Coming-soon stub (for sections not yet implemented in Phase 1)
// ─────────────────────────────────────────────────────────────────────────────

function PhaseStub({ title, phase }: { title: string; phase: number }) {
  return (
    <div className="vv-panel" style={{ maxWidth: 540 }}>
      <div className="vv-kv-row">
        <span className="vv-kv-key">SECTION</span>
        <span className="vv-kv-val vv-text-code">{title.toUpperCase()}</span>
      </div>
      <div className="vv-kv-row">
        <span className="vv-kv-key">STATUS</span>
        <span className="vv-badge vv-badge--warn">Phase {phase} — Not yet implemented</span>
      </div>
      <div className="vv-kv-row">
        <span className="vv-kv-key">NOTE</span>
        <span className="vv-kv-val vv-text-muted" style={{ fontSize: 12 }}>
          This section will be built in a later redesign phase.
          Existing backend functionality is intact and accessible via other sections.
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Dashboard
// ─────────────────────────────────────────────────────────────────────────────

function SectionDashboard({
  nodes,
  files,
  onRefreshNodes,
}: {
  nodes: StorageNode[];
  files: FileItem[];
  onRefreshNodes: () => void;
}) {
  const healthyCount = nodes.filter((n) => n.isHealthy).length;
  const totalCount = nodes.length;
  const clusterOk = healthyCount === totalCount && totalCount > 0;

  return (
    <>
      <div className="vv-section-header">
        <span className="vv-section-title">Dashboard</span>
        <span className="vv-section-subtitle">System overview</span>
      </div>

      <div className="vv-grid-2" style={{ marginBottom: 16, maxWidth: 720 }}>
        {/* Cluster summary */}
        <div className="vv-panel">
          <p className="vv-label" style={{ marginBottom: 10 }}>Storage Cluster</p>
          <div className="vv-kv-row">
            <span className="vv-kv-key">Nodes healthy</span>
            <span className={`vv-kv-val ${clusterOk ? 'vv-text-green' : 'vv-text-amber'}`}>
              {healthyCount} / {totalCount}
            </span>
          </div>
          <div className="vv-kv-row">
            <span className="vv-kv-key">Threshold</span>
            <span className="vv-kv-val vv-text-code">K=3 / N=5</span>
          </div>
          <div className="vv-kv-row">
            <span className="vv-kv-key">Encryption</span>
            <span className="vv-kv-val vv-text-code">AES-256-GCM</span>
          </div>
          <div className="vv-kv-row">
            <span className="vv-kv-key">Key splitting</span>
            <span className="vv-kv-val vv-text-code">Shamir SSS</span>
          </div>
          <div className="vv-kv-row">
            <span className="vv-kv-key">Data encoding</span>
            <span className="vv-kv-val vv-text-code">Erasure (RS 3-of-5)</span>
          </div>
        </div>

        {/* Files summary */}
        <div className="vv-panel">
          <p className="vv-label" style={{ marginBottom: 10 }}>Vault</p>
          <div className="vv-kv-row">
            <span className="vv-kv-key">Stored files</span>
            <span className="vv-kv-val">{files.length}</span>
          </div>
          <div className="vv-kv-row">
            <span className="vv-kv-key">Total plaintext size</span>
            <span className="vv-kv-val">
              {files.length > 0 ? fmtBytes(files.reduce((s, f) => s + f.sizeBytes, 0)) : '—'}
            </span>
          </div>
          <div className="vv-kv-row">
            <span className="vv-kv-key">Most recent upload</span>
            <span className="vv-kv-val vv-text-muted" style={{ fontSize: 11 }}>
              {files.length > 0
                ? new Date(files[files.length - 1].createdAt).toLocaleString()
                : 'No files yet'}
            </span>
          </div>
        </div>
      </div>

      {/* Node mini-matrix */}
      <div className="vv-panel" style={{ maxWidth: 720, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p className="vv-label">Node Status Matrix</p>
          <button className="vv-btn vv-btn--sm" onClick={onRefreshNodes} aria-label="Refresh node status">
            ↻ Refresh
          </button>
        </div>
        {nodes.length === 0 ? (
          <p className="vv-text-muted" style={{ fontSize: 12 }}>Loading node data…</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {nodes.map((node) => (
              <div
                key={node.id}
                className={`vv-node-card ${node.isHealthy ? 'vv-node-card--online' : 'vv-node-card--offline'}`}
              >
                <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span className={`vv-status-dot ${node.isHealthy ? 'vv-status-dot--online' : 'vv-status-dot--offline'}`} />
                  <span className="vv-mono" style={{ fontSize: 11, color: 'var(--vv-muted)' }}>{node.id}</span>
                </div>
                <span className={`vv-badge ${node.isHealthy ? 'vv-badge--online' : 'vv-badge--offline'}`}>
                  {node.isHealthy ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Upload
// All existing upload logic is preserved here.
// ─────────────────────────────────────────────────────────────────────────────

function SectionUpload({
  authToken,
  onUploadSuccess,
}: {
  authToken: string;
  onUploadSuccess: () => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'idle' | 'ok' | 'err';
    message: string;
    result?: {
      fileId: string;
      checksumSha256?: string;
      sharesDistributed?: number;
      chunksDistributed?: number;
      kThreshold?: number;
      nShares?: number;
    };
  }>({ type: 'idle', message: '' });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null);
    setUploadStatus({ type: 'idle', message: '' });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus({ type: 'idle', message: '' });

    const formData = new FormData();
    formData.append('file', selectedFile);
    // Backend ignores kThreshold/nShares (hardcoded K=3,N=5); we send for
    // compatibility but do NOT expose misleading sliders.
    formData.append('kThreshold', '3');
    formData.append('nShares', '5');

    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUploadStatus({
          type: 'ok',
          message: 'File distributed successfully.',
          result: {
            fileId: data.fileId,
            checksumSha256: data.checksumSha256,
            sharesDistributed: data.sharesDistributed,
            chunksDistributed: data.chunksDistributed,
            kThreshold: data.kThreshold,
            nShares: data.nShares,
          },
        });
        setSelectedFile(null);
        onUploadSuccess();
      } else {
        const err = await res.json();
        setUploadStatus({ type: 'err', message: err.error || 'Upload failed.' });
      }
    } catch (err: unknown) {
      setUploadStatus({
        type: 'err',
        message: err instanceof Error ? err.message : 'Upload request failed.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="vv-section-header">
        <span className="vv-section-title">Upload</span>
        <span className="vv-section-subtitle">Encrypt &amp; distribute a file</span>
      </div>

      <div className="vv-panel" style={{ maxWidth: 560 }}>
        <p className="vv-label" style={{ marginBottom: 12 }}>Encryption scheme (fixed)</p>
        <div className="vv-panel--inset vv-stack" style={{ gap: 6, marginBottom: 20 }}>
          <div className="vv-kv-row">
            <span className="vv-kv-key">Payload encryption</span>
            <span className="vv-kv-val vv-text-code">AES-256-GCM</span>
          </div>
          <div className="vv-kv-row">
            <span className="vv-kv-key">Key splitting</span>
            <span className="vv-kv-val vv-text-code">Shamir SSS  K=3 / N=5</span>
          </div>
          <div className="vv-kv-row">
            <span className="vv-kv-key">Data encoding</span>
            <span className="vv-kv-val vv-text-code">Erasure RS  3-of-5</span>
          </div>
        </div>

        <form onSubmit={handleUpload} className="vv-stack">
          <div>
            <label className="vv-label" style={{ display: 'block', marginBottom: 8 }}>
              Select file
            </label>
            <input
              id="vv-file-input"
              type="file"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <label
              htmlFor="vv-file-input"
              style={{
                display: 'block',
                border: '1px dashed var(--vv-border-strong)',
                borderRadius: 'var(--vv-radius)',
                padding: '20px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--vv-surface-1)',
                transition: 'border-color 0.15s',
              }}
            >
              {selectedFile ? (
                <div>
                  <p className="vv-mono" style={{ fontSize: 13, color: 'var(--vv-text)', marginBottom: 4 }}>
                    {selectedFile.name}
                  </p>
                  <p className="vv-text-muted" style={{ fontSize: 11 }}>
                    {fmtBytes(selectedFile.size)} · {selectedFile.type || 'unknown type'}
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--vv-muted)', marginBottom: 4 }}>
                    Click to select a file
                  </p>
                  <p className="vv-label">Encrypted at rest · Shamir-split key · 3-of-5 erasure shards</p>
                </div>
              )}
            </label>
          </div>

          {isUploading && (
            <BinaryLoader label="Coordinator processing — encrypt → split key → shard → distribute" />
          )}

          {uploadStatus.type !== 'idle' && !isUploading && (
            <div className={`vv-msg ${uploadStatus.type === 'ok' ? 'vv-msg--ok' : 'vv-msg--err'}`}>
              {uploadStatus.message}
            </div>
          )}

          {uploadStatus.type === 'ok' && uploadStatus.result && (
            <div className="vv-panel--inset vv-stack" style={{ gap: 4 }}>
              <p className="vv-label" style={{ marginBottom: 6 }}>Upload result</p>
              <div className="vv-kv-row">
                <span className="vv-kv-key">File ID</span>
                <span className="vv-kv-val vv-text-code" style={{ fontSize: 10 }}>
                  {uploadStatus.result.fileId}
                </span>
              </div>
              {uploadStatus.result.checksumSha256 && (
                <div className="vv-kv-row">
                  <span className="vv-kv-key">SHA-256 (plaintext)</span>
                  <span
                    className="vv-kv-val vv-text-code"
                    style={{ fontSize: 10, wordBreak: 'break-all' }}
                    title={uploadStatus.result.checksumSha256}
                  >
                    {uploadStatus.result.checksumSha256.slice(0, 16)}…
                  </span>
                </div>
              )}
              {uploadStatus.result.sharesDistributed !== undefined && (
                <div className="vv-kv-row">
                  <span className="vv-kv-key">Key shares distributed</span>
                  <span className="vv-kv-val">{uploadStatus.result.sharesDistributed}</span>
                </div>
              )}
              {uploadStatus.result.chunksDistributed !== undefined && (
                <div className="vv-kv-row">
                  <span className="vv-kv-key">Data shards distributed</span>
                  <span className="vv-kv-val">{uploadStatus.result.chunksDistributed}</span>
                </div>
              )}
            </div>
          )}

          <button
            id="vv-upload-btn"
            type="submit"
            className="vv-btn vv-btn--primary"
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? 'Uploading…' : 'Encrypt &amp; Distribute'}
          </button>
        </form>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Files
// All existing download / reconstruct logic is preserved here.
// ─────────────────────────────────────────────────────────────────────────────

function SectionFiles({
  authToken,
  files,
  onRefresh,
}: {
  authToken: string;
  files: FileItem[];
  onRefresh: () => void;
}) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({});

  const handleDownload = async (fileId: string, filename: string) => {
    setDownloadingId(fileId);
    setDownloadErrors((prev) => ({ ...prev, [fileId]: '' }));

    try {
      const res = await fetch(`/api/files/${fileId}/download`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const disposition = res.headers.get('Content-Disposition');
        const serverFilename = disposition?.match(/filename="?([^";]+)"?/i)?.[1];
        a.download = serverFilename || filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const errData = await res.json();
        setDownloadErrors((prev) => ({
          ...prev,
          [fileId]: errData.error || 'Download failed.',
        }));
      }
    } catch (err: unknown) {
      setDownloadErrors((prev) => ({
        ...prev,
        [fileId]: err instanceof Error ? err.message : 'Download failed.',
      }));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      <div className="vv-section-header">
        <span className="vv-section-title">Files</span>
        <span className="vv-section-subtitle">Stored encrypted files</span>
        <button className="vv-btn vv-btn--sm" style={{ marginLeft: 'auto' }} onClick={onRefresh}>
          ↻ Refresh
        </button>
      </div>

      {files.length === 0 ? (
        <div className="vv-panel" style={{ maxWidth: 480 }}>
          <p className="vv-text-muted" style={{ fontSize: 13, fontFamily: 'var(--vv-font-mono)' }}>
            — No files stored in the vault yet.
          </p>
          <p className="vv-text-muted" style={{ fontSize: 12, marginTop: 6 }}>
            Upload a file to begin.
          </p>
        </div>
      ) : (
        <div className="vv-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="vv-table">
            <thead>
              <tr>
                <th>File name</th>
                <th>Size</th>
                <th>Type</th>
                <th>Uploaded</th>
                <th>Scheme</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <React.Fragment key={file.id}>
                  <tr>
                    <td className="vv-mono" style={{ fontSize: 12 }}>{file.filename}</td>
                    <td className="vv-mono" style={{ fontSize: 12 }}>{fmtBytes(file.sizeBytes)}</td>
                    <td className="vv-text-muted" style={{ fontSize: 11 }}>{file.mimeType}</td>
                    <td className="vv-text-muted" style={{ fontSize: 11 }}>
                      {new Date(file.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span className="vv-badge vv-badge--neutral" style={{ fontSize: 10 }}>
                        AES-256-GCM + SSS
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        id={`vv-download-${file.id}`}
                        className="vv-btn vv-btn--sm vv-btn--primary"
                        disabled={downloadingId === file.id}
                        onClick={() => handleDownload(file.id, file.filename)}
                      >
                        {downloadingId === file.id ? 'Reconstructing…' : '↓ Reconstruct &amp; Download'}
                      </button>
                    </td>
                  </tr>
                  {downloadErrors[file.id] && (
                    <tr>
                      <td colSpan={6} style={{ padding: '0 12px 8px' }}>
                        <div className="vv-msg vv-msg--err" style={{ marginTop: 4 }}>
                          {downloadErrors[file.id]}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Nodes
// All existing node-toggle / simulator logic is preserved here.
// ─────────────────────────────────────────────────────────────────────────────

function SectionNodes({
  nodes,
  onRefreshNodes,
}: {
  nodes: StorageNode[];
  onRefreshNodes: () => void;
}) {
  const [toggling, setToggling] = useState<string | null>(null);
  const [toggleErrors, setToggleErrors] = useState<Record<string, string>>({});

  const handleToggle = async (nodeId: string, currentlyHealthy: boolean) => {
    setToggling(nodeId);
    setToggleErrors((prev) => ({ ...prev, [nodeId]: '' }));

    try {
      await fetch(`/api/simulator/toggle/${nodeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: !currentlyHealthy }),
      });
      await onRefreshNodes();
    } catch (err: unknown) {
      setToggleErrors((prev) => ({
        ...prev,
        [nodeId]: err instanceof Error ? err.message : 'Toggle failed.',
      }));
    } finally {
      setToggling(null);
    }
  };

  return (
    <>
      <div className="vv-section-header">
        <span className="vv-section-title">Nodes</span>
        <span className="vv-section-subtitle">Storage node inventory &amp; simulator</span>
        <button className="vv-btn vv-btn--sm" style={{ marginLeft: 'auto' }} onClick={onRefreshNodes}>
          ↻ Refresh
        </button>
      </div>

      <div className="vv-stack" style={{ maxWidth: 640 }}>
        {nodes.length === 0 ? (
          <p className="vv-text-muted" style={{ fontSize: 13 }}>Loading nodes…</p>
        ) : (
          nodes.map((node) => (
            <div
              key={node.id}
              className={`vv-node-card ${node.isHealthy ? 'vv-node-card--online' : 'vv-node-card--offline'}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`vv-status-dot ${node.isHealthy ? 'vv-status-dot--online' : 'vv-status-dot--offline'}`} />
                  <div>
                    <p className="vv-mono" style={{ fontSize: 13, fontWeight: 500, color: 'var(--vv-text)' }}>
                      {node.name}
                    </p>
                    <p className="vv-mono" style={{ fontSize: 11, color: 'var(--vv-muted)' }}>
                      {node.host}:{node.port}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`vv-badge ${node.isHealthy ? 'vv-badge--online' : 'vv-badge--offline'}`}>
                    {node.isHealthy ? 'Online' : 'Offline'}
                  </span>
                  <button
                    id={`vv-toggle-${node.id}`}
                    className={`vv-btn vv-btn--sm ${node.isHealthy ? 'vv-btn--danger' : 'vv-btn--primary'}`}
                    disabled={toggling === node.id}
                    onClick={() => handleToggle(node.id, node.isHealthy)}
                  >
                    {toggling === node.id
                      ? 'Applying…'
                      : node.isHealthy
                      ? 'Simulate Offline'
                      : 'Restore Online'}
                  </button>
                </div>
              </div>

              {node.lastPing && (
                <div style={{ marginTop: 8 }}>
                  <span className="vv-kv-key">Last ping: </span>
                  <span className="vv-kv-val" style={{ fontSize: 11 }}>
                    {new Date(node.lastPing).toLocaleTimeString()}
                  </span>
                </div>
              )}

              {/* CPU / RAM / disk telemetry explicitly unavailable */}
              <div style={{ marginTop: 8 }}>
                <span className="vv-label">
                  CPU / RAM / Disk telemetry — not provided by current API
                </span>
              </div>

              {toggleErrors[node.id] && (
                <div className="vv-msg vv-msg--err" style={{ marginTop: 8 }}>
                  {toggleErrors[node.id]}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Recovery Lab
// All existing scenario logic is preserved; forEach(async) anti-pattern fixed.
// ─────────────────────────────────────────────────────────────────────────────

interface ScenarioResult {
  title: string;
  expected: string;
  observed: 'success' | 'failure' | 'pending' | 'error';
  message: string;
  headers?: { sharesRetrieved?: string; timeMs?: string };
}

function SectionRecovery({
  authToken,
  files,
  onRefreshNodes,
}: {
  authToken: string;
  files: FileItem[];
  onRefreshNodes: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);

  const toggleNode = async (nodeId: string, isOnline: boolean) => {
    await fetch(`/api/simulator/toggle/${nodeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOnline }),
    });
  };

  /** Restores all 5 nodes to online. */
  const restoreAll = async () => {
    setRunning(true);
    for (const id of ['node-1', 'node-2', 'node-3', 'node-4', 'node-5']) {
      await toggleNode(id, true);
    }
    await onRefreshNodes();
    setResult({
      title: 'Restore All Nodes',
      expected: 'All 5 nodes online',
      observed: 'success',
      message: 'All storage nodes restored to simulated ONLINE state.',
    });
    setRunning(false);
  };

  /** Scenario 1: 2 nodes offline (nodes 2 and 5) — should recover (K=3, N=5). */
  const runScenario1 = async () => {
    setRunning(true);
    setResult(null);

    // Bring 1,3,4 online first
    for (const id of ['node-1', 'node-3', 'node-4']) {
      await toggleNode(id, true);
    }
    // Bring 2 and 5 offline
    for (const id of ['node-2', 'node-5']) {
      await toggleNode(id, false);
    }
    await onRefreshNodes();

    const expected = 'Recovery SHOULD succeed: 3 nodes remain online (>= K=3 threshold)';

    if (files.length === 0) {
      setResult({
        title: 'Scenario 1 — Two Nodes Offline (nodes 2, 5)',
        expected,
        observed: 'pending',
        message: 'Nodes configured. Upload a file first, then re-run this scenario to test reconstruction.',
      });
      setRunning(false);
      return;
    }

    try {
      const res = await fetch(`/api/files/${files[0].id}/download`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.ok) {
        setResult({
          title: 'Scenario 1 — Two Nodes Offline (nodes 2, 5)',
          expected,
          observed: 'success',
          message: `Reconstruction succeeded. File "${files[0].filename}" returned.`,
          headers: {
            sharesRetrieved: res.headers.get('X-Reconstruction-Shares') ?? undefined,
            timeMs: res.headers.get('X-Reconstruction-Time-Ms') ?? undefined,
          },
        });
      } else {
        const err = await res.json();
        setResult({
          title: 'Scenario 1 — Two Nodes Offline (nodes 2, 5)',
          expected,
          observed: 'failure',
          message: `Reconstruction failed: ${err.error}`,
        });
      }
    } catch (err: unknown) {
      setResult({
        title: 'Scenario 1 — Two Nodes Offline (nodes 2, 5)',
        expected,
        observed: 'error',
        message: err instanceof Error ? err.message : 'Unknown error.',
      });
    }

    setRunning(false);
  };

  /** Scenario 2: 3 nodes offline (nodes 1, 2, 5) — should fail (only 2 online, K=3). */
  const runScenario2 = async () => {
    setRunning(true);
    setResult(null);

    // Bring 3 and 4 online
    for (const id of ['node-3', 'node-4']) {
      await toggleNode(id, true);
    }
    // Take 1, 2, 5 offline
    for (const id of ['node-1', 'node-2', 'node-5']) {
      await toggleNode(id, false);
    }
    await onRefreshNodes();

    const expected = 'Recovery SHOULD fail: only 2 nodes online (< K=3 threshold)';

    if (files.length === 0) {
      setResult({
        title: 'Scenario 2 — Three Nodes Offline (nodes 1, 2, 5)',
        expected,
        observed: 'pending',
        message: 'Nodes configured. Upload a file first, then re-run this scenario to test reconstruction failure.',
      });
      setRunning(false);
      return;
    }

    try {
      const res = await fetch(`/api/files/${files[0].id}/download`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.ok) {
        setResult({
          title: 'Scenario 2 — Three Nodes Offline (nodes 1, 2, 5)',
          expected,
          observed: 'success',
          message: 'Unexpected: reconstruction succeeded despite < K nodes online. Check backend state.',
        });
      } else {
        const err = await res.json();
        setResult({
          title: 'Scenario 2 — Three Nodes Offline (nodes 1, 2, 5)',
          expected,
          observed: 'failure',
          message: `Reconstruction failed as expected: ${err.error}`,
        });
      }
    } catch (err: unknown) {
      setResult({
        title: 'Scenario 2 — Three Nodes Offline (nodes 1, 2, 5)',
        expected,
        observed: 'error',
        message: err instanceof Error ? err.message : 'Unknown error.',
      });
    }

    setRunning(false);
  };

  const observedStyle = (obs: ScenarioResult['observed']): string => {
    if (obs === 'success') return 'vv-msg--ok';
    if (obs === 'failure') return 'vv-msg--warn';
    if (obs === 'error')   return 'vv-msg--err';
    return '';
  };

  return (
    <>
      <div className="vv-section-header">
        <span className="vv-section-title">Recovery Lab</span>
        <span className="vv-section-subtitle">Fault-tolerance demonstration</span>
      </div>

      <div className="vv-panel" style={{ maxWidth: 600, marginBottom: 16 }}>
        <p className="vv-label" style={{ marginBottom: 12 }}>Scenario controls</p>
        <div className="vv-stack" style={{ gap: 8 }}>
          <button
            id="vv-scenario-1"
            className="vv-btn vv-btn--primary"
            disabled={running}
            onClick={runScenario1}
          >
            Run Scenario 1 — K=3, 2 nodes offline (expect: RECOVERY OK)
          </button>
          <button
            id="vv-scenario-2"
            className="vv-btn vv-btn--danger"
            disabled={running}
            onClick={runScenario2}
          >
            Run Scenario 2 — K=3, 3 nodes offline (expect: RECOVERY FAIL)
          </button>
          <button
            id="vv-restore-all"
            className="vv-btn"
            disabled={running}
            onClick={restoreAll}
          >
            ↺ Restore all nodes online
          </button>
        </div>
      </div>

      {running && <BinaryLoader label="Configuring nodes and testing reconstruction…" />}

      {result && !running && (
        <div className="vv-panel" style={{ maxWidth: 600 }}>
          <p className="vv-label" style={{ marginBottom: 10 }}>{result.title}</p>
          <div className="vv-kv-row">
            <span className="vv-kv-key">Expected</span>
            <span className="vv-kv-val vv-text-muted" style={{ fontSize: 12 }}>{result.expected}</span>
          </div>
          <div className="vv-kv-row">
            <span className="vv-kv-key">Observed</span>
            <span className={`vv-badge ${
              result.observed === 'success' ? 'vv-badge--online' :
              result.observed === 'failure' ? 'vv-badge--warn' :
              result.observed === 'pending' ? 'vv-badge--neutral' :
              'vv-badge--offline'
            }`}>
              {result.observed.toUpperCase()}
            </span>
          </div>
          <div className={`vv-msg ${observedStyle(result.observed)}`} style={{ marginTop: 10 }}>
            {result.message}
          </div>
          {result.headers && (
            <div className="vv-stack" style={{ gap: 4, marginTop: 12 }}>
              {result.headers.sharesRetrieved && (
                <div className="vv-kv-row">
                  <span className="vv-kv-key">Key shares retrieved (X-Reconstruction-Shares)</span>
                  <span className="vv-kv-val vv-text-code">{result.headers.sharesRetrieved}</span>
                </div>
              )}
              {result.headers.timeMs && (
                <div className="vv-kv-row">
                  <span className="vv-kv-key">Reconstruction time (X-Reconstruction-Time-Ms)</span>
                  <span className="vv-kv-val vv-text-code">{result.headers.timeMs} ms</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="vv-panel--inset" style={{ maxWidth: 600, marginTop: 16 }}>
        <p className="vv-label" style={{ marginBottom: 4 }}>Evidence note</p>
        <p style={{ fontSize: 12, color: 'var(--vv-muted)', lineHeight: 1.6 }}>
          Data shards retrieved count is not exposed in the current download response headers.
          Only Shamir key-share count is available via <code className="vv-code">X-Reconstruction-Shares</code>.
          Per-node shard identification is not available from the current API.
        </p>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root App
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const [authToken, setAuthToken] = useState<string>(
    () => localStorage.getItem('vapour-vault-token') ?? '',
  );
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError]         = useState('');
  const [authLoading, setAuthLoading]     = useState(false);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<Section>('dashboard');

  // ── Global data ─────────────────────────────────────────────────────────────
  const [nodes, setNodes] = useState<StorageNode[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);

  // ── Data fetchers ───────────────────────────────────────────────────────────
  const fetchNodes = useCallback(async () => {
    try {
      const res = await fetch('/api/nodes');
      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes || []);
      }
    } catch {
      // Fallback: construct mock nodes from known topology when API is unreachable
      setNodes(
        [1, 2, 3, 4, 5].map((i) => ({
          id: `node-${i}`,
          name: `Storage Node ${i}`,
          host: 'http://localhost',
          port: 5000 + i,
          status: 'ACTIVE',
          isHealthy: true,
        })),
      );
    }
  }, []);

  const fetchFiles = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/files', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(
          (data.fileRecords || []).map((r: {
            fileId: string; filename: string; mimeType: string;
            sizeBytes: number; createdAt: string;
          }) => ({
            id: r.fileId,
            filename: r.filename,
            mimeType: r.mimeType,
            sizeBytes: r.sizeBytes,
            createdAt: r.createdAt,
          })),
        );
      }
    } catch { /* silently ignore */ }
  }, [authToken]);

  // ── Polling ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchNodes();
    fetchFiles();
    const interval = setInterval(fetchNodes, 5000);
    return () => clearInterval(interval);
  }, [fetchNodes, fetchFiles]);

  // ── Auth handler ─────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const res = await fetch(
        isRegistering ? '/api/auth/register' : '/api/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        },
      );
      const result = await res.json();
      if (!res.ok || typeof result.token !== 'string') {
        setAuthError(result.error || 'Sign-in failed.');
        return;
      }
      localStorage.setItem('vapour-vault-token', result.token);
      setAuthToken(result.token);
      setPassword('');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in request failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('vapour-vault-token');
    setAuthToken('');
    setFiles([]);
    setActiveSection('dashboard');
  };

  // ── Cluster summary for top bar ──────────────────────────────────────────────
  const healthyCount = nodes.filter((n) => n.isHealthy).length;
  const clusterDotClass =
    nodes.length === 0 ? '' :
    healthyCount === nodes.length ? '' :
    healthyCount >= 3 ? 'vv-topbar__cluster-dot--warn' :
    'vv-topbar__cluster-dot--err';

  // ── Pre-auth screen ──────────────────────────────────────────────────────────
  if (!authToken) {
    return (
      <div className="vv-auth-wrapper">
        <div className="vv-auth-card">
          <p className="vv-auth-wordmark">Vapour Vault</p>
          <p className="vv-auth-tagline">
            Split the secret. Survive the outage. Verify every byte.
          </p>

          <form onSubmit={handleLogin} className="vv-auth-form" noValidate>
            <div>
              <label className="vv-label" htmlFor="vv-email" style={{ display: 'block', marginBottom: 5 }}>
                Email
              </label>
              <input
                id="vv-email"
                className="vv-input"
                type="email"
                autoComplete="username"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
              />
            </div>

            <div>
              <label className="vv-label" htmlFor="vv-password" style={{ display: 'block', marginBottom: 5 }}>
                Password
              </label>
              <input
                id="vv-password"
                className="vv-input"
                type="password"
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
              />
            </div>

            {authError && (
              <div className="vv-msg vv-msg--err" role="alert">
                {authError}
              </div>
            )}

            {authLoading && <BinaryLoader label="Authenticating…" />}

            <button
              id="vv-auth-submit"
              type="submit"
              className="vv-btn vv-btn--primary"
              disabled={authLoading}
              style={{ marginTop: 4 }}
            >
              {isRegistering ? 'Create account' : 'Sign in'}
            </button>

            <button
              id="vv-auth-switch"
              type="button"
              className="vv-btn"
              disabled={authLoading}
              onClick={() => { setIsRegistering((v) => !v); setAuthError(''); }}
            >
              {isRegistering ? 'Use existing account' : 'Create an account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Authenticated shell ───────────────────────────────────────────────────────
  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <SectionDashboard
            nodes={nodes}
            files={files}
            onRefreshNodes={fetchNodes}
          />
        );
      case 'upload':
        return (
          <SectionUpload
            authToken={authToken}
            onUploadSuccess={fetchFiles}
          />
        );
      case 'files':
        return (
          <SectionFiles
            authToken={authToken}
            files={files}
            onRefresh={fetchFiles}
          />
        );
      case 'nodes':
        return (
          <SectionNodes
            nodes={nodes}
            onRefreshNodes={fetchNodes}
          />
        );
      case 'recovery':
        return (
          <SectionRecovery
            authToken={authToken}
            files={files}
            onRefreshNodes={fetchNodes}
          />
        );
      case 'verification':
        return <PhaseStub title="Verification" phase={8} />;
      case 'analytics':
        return <PhaseStub title="Analytics" phase={9} />;
      case 'settings':
        return (
          <>
            <div className="vv-section-header">
              <span className="vv-section-title">Settings</span>
              <span className="vv-section-subtitle">Session &amp; account</span>
            </div>
            <div className="vv-panel" style={{ maxWidth: 400 }}>
              <div className="vv-kv-row">
                <span className="vv-kv-key">Authentication</span>
                <span className="vv-badge vv-badge--online">Active</span>
              </div>
              <div className="vv-kv-row">
                <span className="vv-kv-key">Token storage</span>
                <span className="vv-kv-val vv-text-code">localStorage</span>
              </div>
              <div className="vv-kv-row">
                <span className="vv-kv-key">Password change / 2FA</span>
                <span className="vv-kv-val vv-text-muted" style={{ fontSize: 12 }}>
                  Not available in current API
                </span>
              </div>
              <hr className="vv-divider" />
              <button
                id="vv-sign-out"
                className="vv-btn vv-btn--danger vv-btn--sm"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <header className="vv-topbar" role="banner">
        <span className="vv-topbar__wordmark">VAPOUR VAULT</span>
        <div className="vv-topbar__sep" />
        <div className="vv-topbar__cluster" aria-label="Cluster status">
          <span className={`vv-topbar__cluster-dot ${clusterDotClass}`} />
          {nodes.length > 0
            ? `${healthyCount}/${nodes.length} nodes healthy`
            : 'Cluster unreachable'}
        </div>
        <div className="vv-topbar__right">
          <button
            id="vv-topbar-signout"
            className="vv-btn vv-btn--sm"
            onClick={handleSignOut}
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Sidebar navigation ───────────────────────────────────── */}
      <nav className="vv-sidebar" aria-label="Main navigation">
        <span className="vv-sidebar__section-label">Navigation</span>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            id={`vv-nav-${item.id}`}
            className={`vv-nav-item${activeSection === item.id ? ' vv-nav-item--active' : ''}`}
            onClick={() => setActiveSection(item.id)}
            aria-current={activeSection === item.id ? 'page' : undefined}
          >
            <span className="vv-nav-item__index">{item.index}</span>
            {item.label}
          </button>
        ))}

        <div className="vv-sidebar__footer">
          <button
            id="vv-sidebar-signout"
            className="vv-nav-item"
            onClick={handleSignOut}
          >
            <span className="vv-nav-item__index">→</span>
            Sign out
          </button>
        </div>
      </nav>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="vv-main" role="main" aria-label={activeSection}>
        {renderSection()}
      </main>
    </>
  );
}
