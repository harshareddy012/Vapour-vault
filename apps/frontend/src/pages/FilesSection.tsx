import React, { useState, useMemo, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FileItem {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  status?: string;
  checksumSha256?: string;
}

export interface DownloadResult {
  fileId: string;
  filename: string;
  sizeBytes: number;
  reconstructionShares?: number;
  serverTimeMs?: number;
  clientDurationMs: number;
  downloadedSha256: string;
  baselineSha256: string | null;
  baselineSource?: 'api' | 'session' | 'none';
  matchStatus: 'verified' | 'mismatch' | 'unverified';
  downloadedAt: string;
}

interface FilesSectionProps {
  authToken: string;
  files: FileItem[];
  isLoading?: boolean;
  onRefresh: () => void;
  onNavigate?: (section: string) => void;
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

function fmtRelativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return '—';
  }
}

function mimeLabel(mime: string): string {
  if (!mime) return 'BIN';
  const parts = mime.split('/');
  return (parts[1] || parts[0]).toUpperCase().slice(0, 10);
}

function truncHash(hash: string, head = 8, tail = 8): string {
  if (!hash || hash.length <= head + tail + 2) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Binary / Ciphertext Loader for in-flight requests (never a circular spinner)
// ─────────────────────────────────────────────────────────────────────────────

const CIPHER_FRAMES = [
  'A7 C1 09 F2 3B E8 5D 14 6A 90 B3 D7 2F 48 C5',
  'E8 5D 14 A7 90 B3 6A C1 2F 48 D7 09 F2 3B C5',
  '14 6A 90 E8 C1 2F 5D 48 D7 A7 09 B3 C5 F2 3B',
  '90 B3 D7 14 48 C5 6A 2F A7 E8 3B 09 F2 5D C1',
];

function TechnicalLoader({ label }: { label: string }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % CIPHER_FRAMES.length), 260);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="vv-files-loader-strip" role="status" aria-live="polite">
      <div className="vv-files-loader-code" aria-hidden="true">
        {CIPHER_FRAMES[frame]}
      </div>
      <span className="vv-files-loader-label">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main FilesSection Component
// ─────────────────────────────────────────────────────────────────────────────

export function FilesSection({
  authToken,
  files,
  isLoading = false,
  onRefresh,
  onNavigate,
}: FilesSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({});
  const [downloadResult, setDownloadResult] = useState<DownloadResult | null>(null);
  const [copiedHashKey, setCopiedHashKey] = useState<string | null>(null);
  const [revealedHashes, setRevealedHashes] = useState<Record<string, boolean>>({});

  // Client-side search filtering (safe, non-destructive, zero API changes)
  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return files;
    return files.filter(
      (f) =>
        f.filename.toLowerCase().includes(q) ||
        f.mimeType.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q) ||
        (f.status && f.status.toLowerCase().includes(q)),
    );
  }, [files, searchQuery]);

  // Aggregate vault metrics
  const totalVaultBytes = useMemo(
    () => files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0),
    [files],
  );

  // Helper to copy text with transient visual feedback
  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHashKey(key);
      setTimeout(() => setCopiedHashKey(null), 2000);
    } catch {
      // Fallback for non-secure contexts
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedHashKey(key);
      setTimeout(() => setCopiedHashKey(null), 2000);
    }
  };

  const toggleReveal = (key: string) => {
    setRevealedHashes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Download & Reconstruct Handler
  // Strictly keeps user inside Files section and presents full inline proof
  // ───────────────────────────────────────────────────────────────────────────
  const handleDownload = useCallback(
    async (file: FileItem) => {
      setDownloadingId(file.id);
      setDownloadErrors((prev) => ({ ...prev, [file.id]: '' }));

      const startTime = performance.now();

      try {
        const res = await fetch(`/api/files/${file.id}/download`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        const clientDurationMs = Math.round(performance.now() - startTime);

        if (!res.ok) {
          let errMsg = `Reconstruction failed (HTTP ${res.status})`;
          try {
            const errJson = await res.json();
            errMsg = errJson.error || errMsg;
          } catch {
            /* ignore JSON parse failure */
          }
          setDownloadErrors((prev) => ({ ...prev, [file.id]: errMsg }));
          return;
        }

        // Headers inspect: X-Reconstruction-Shares (Shamir key shares) and X-Reconstruction-Time-Ms
        const sharesHeader = res.headers.get('X-Reconstruction-Shares');
        const timeHeader = res.headers.get('X-Reconstruction-Time-Ms');
        const disposition = res.headers.get('Content-Disposition');
        const serverFilename = disposition?.match(/filename="?([^";]+)"?/i)?.[1];
        const finalFilename = serverFilename || file.filename;

        // Retrieve actual binary bytes
        const blob = await res.blob();
        const arrayBuffer = await blob.arrayBuffer();

        // Calculate SHA-256 directly on downloaded bytes using Web Crypto API
        let downloadedSha256 = '';
        if (crypto?.subtle?.digest) {
          const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          downloadedSha256 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        }

        // Look for original baseline checksum:
        // 1. Direct record property (if returned by backend)
        // 2. Client-recorded session registry (preserved on upload in this browser session)
        let baselineSha256: string | null = null;
        let baselineSource: 'api' | 'session' | 'none' = 'none';

        if (file.checksumSha256 && file.checksumSha256.trim() !== '') {
          baselineSha256 = file.checksumSha256.trim().toLowerCase();
          baselineSource = 'api';
        } else {
          try {
            const sessionVal = sessionStorage.getItem(`vv_checksum_${file.id}`);
            if (sessionVal && sessionVal.trim() !== '') {
              baselineSha256 = sessionVal.trim().toLowerCase();
              baselineSource = 'session';
            }
          } catch {
            /* ignore storage access restriction */
          }
        }

        // Compare complete normalized lowercase hexadecimal hashes
        let matchStatus: 'verified' | 'mismatch' | 'unverified' = 'unverified';
        if (baselineSha256 && downloadedSha256) {
          matchStatus =
            baselineSha256 === downloadedSha256.toLowerCase() ? 'verified' : 'mismatch';
        }

        const result: DownloadResult = {
          fileId: file.id,
          filename: finalFilename,
          sizeBytes: blob.size,
          reconstructionShares: sharesHeader ? parseInt(sharesHeader, 10) : undefined,
          serverTimeMs: timeHeader ? parseInt(timeHeader, 10) : undefined,
          clientDurationMs,
          downloadedSha256,
          baselineSha256,
          baselineSource,
          matchStatus,
          downloadedAt: new Date().toISOString(),
        };

        // Set inline result state to display in the Files section
        setDownloadResult(result);

        // Preserve download evidence in sessionStorage for Section 6 (Verification)
        try {
          sessionStorage.setItem('vv_last_download_evidence', JSON.stringify(result));
        } catch {
          /* ignore storage error */
        }

        // Trigger browser save dialog while preserving exact returned file bytes
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = finalFilename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 150);
      } catch (err: unknown) {
        setDownloadErrors((prev) => ({
          ...prev,
          [file.id]: err instanceof Error ? err.message : 'Download request failed.',
        }));
      } finally {
        setDownloadingId(null);
      }
    },
    [authToken],
  );

  return (
    <div className="vv-files-page">
      {/* ── Section Header ─────────────────────────────────────────── */}
      <div className="vv-section-header">
        <div>
          <span className="vv-section-title">Files</span>
          <span className="vv-section-subtitle">
            Encrypted file vault &amp; Shamir reconstruction
          </span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            id="vv-files-refresh-btn"
            className="vv-btn vv-btn--sm"
            onClick={onRefresh}
            disabled={isLoading || downloadingId !== null}
            aria-label="Refresh file vault"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Vault Operational Stats Strip ──────────────────────────── */}
      <div className="vv-files-stats-strip">
        <div className="vv-files-stat-box">
          <span className="vv-files-stat-label">VAULT FILES</span>
          <span className="vv-files-stat-val vv-text-code">{files.length}</span>
          <span className="vv-files-stat-sub">
            {files.length === 1 ? '1 item stored' : `${files.length} items stored`}
          </span>
        </div>
        <div className="vv-files-stat-box">
          <span className="vv-files-stat-label">PLAINTEXT VOLUME</span>
          <span className="vv-files-stat-val vv-text-code">{fmtBytes(totalVaultBytes)}</span>
          <span className="vv-files-stat-sub">Distributed across cluster</span>
        </div>
        <div className="vv-files-stat-box">
          <span className="vv-files-stat-label">ENCRYPTION SCHEME</span>
          <span className="vv-files-stat-val vv-text-code" style={{ fontSize: 13 }}>
            AES-256-GCM
          </span>
          <span className="vv-files-stat-sub">Authenticated symmetric payload</span>
        </div>
        <div className="vv-files-stat-box">
          <span className="vv-files-stat-label">KEY SPLITTING</span>
          <span className="vv-files-stat-val vv-text-code" style={{ fontSize: 13 }}>
            SSS K=3 / N=5
          </span>
          <span className="vv-files-stat-sub">3 key shares required to decrypt</span>
        </div>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────────── */}
      <div className="vv-files-toolbar">
        <div className="vv-files-search-wrap">
          <span className="vv-files-search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            id="vv-files-search-input"
            type="text"
            className="vv-input vv-files-search-input"
            placeholder="Search by filename, MIME type, or file ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Filter file table"
          />
          {searchQuery && (
            <button
              type="button"
              className="vv-files-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear filter"
            >
              ✕
            </button>
          )}
        </div>
        <div className="vv-files-filter-status">
          {searchQuery ? (
            <span className="vv-text-muted" style={{ fontSize: 12 }}>
              Showing <strong className="vv-text-green">{filteredFiles.length}</strong> of{' '}
              {files.length} files
            </span>
          ) : (
            <span className="vv-text-muted" style={{ fontSize: 12 }}>
              {files.length} file{files.length === 1 ? '' : 's'} in vault
            </span>
          )}
        </div>
      </div>

      {/* ── Active Downloading Terminal Loader ──────────────────────── */}
      {downloadingId && (
        <div className="vv-panel" style={{ marginBottom: 16, borderColor: 'var(--vv-border-strong)' }}>
          <TechnicalLoader
            label={`Reconstructing file ${
              files.find((f) => f.id === downloadingId)?.filename || downloadingId
            } — gathering key shares & decrypting payload…`}
          />
        </div>
      )}

      {/* ── Inline Download Result & Cryptographic Proof Panel ────────── */}
      {downloadResult && (
        <section
          aria-label="Reconstruction result"
          className="vv-panel vv-files-result-panel"
        >
          <div className="vv-files-result-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                className={`vv-status-dot ${
                  downloadResult.matchStatus === 'verified'
                    ? 'vv-status-dot--online'
                    : downloadResult.matchStatus === 'mismatch'
                    ? 'vv-status-dot--offline'
                    : 'vv-status-dot--warn'
                }`}
              />
              <span className="vv-files-result-title">
                RECONSTRUCTION RESULT — {downloadResult.filename}
              </span>
            </div>
            <button
              type="button"
              className="vv-btn vv-btn--sm"
              onClick={() => setDownloadResult(null)}
              aria-label="Dismiss result panel"
            >
              ✕ Close
            </button>
          </div>

          <div className="vv-files-result-grid">
            {/* Left: Reconstructed file telemetry */}
            <div className="vv-files-result-card">
              <h4 className="vv-files-result-section-title">RETRIEVAL &amp; RECONSTRUCTION</h4>
              <div className="vv-stack" style={{ gap: 6 }}>
                <div className="vv-kv-row">
                  <span className="vv-kv-key">File name</span>
                  <span className="vv-kv-val vv-text-code">{downloadResult.filename}</span>
                </div>
                <div className="vv-kv-row">
                  <span className="vv-kv-key">Recovered payload</span>
                  <span className="vv-kv-val vv-mono">{fmtBytes(downloadResult.sizeBytes)}</span>
                </div>
                <div className="vv-kv-row">
                  <span className="vv-kv-key">Shamir key shares</span>
                  <span className="vv-kv-val vv-text-code">
                    {downloadResult.reconstructionShares !== undefined
                      ? `${downloadResult.reconstructionShares} shares retrieved`
                      : 'Not reported by header'}
                  </span>
                </div>
                <div className="vv-kv-row">
                  <span className="vv-kv-key">Coordinator decode time</span>
                  <span className="vv-kv-val vv-text-code">
                    {downloadResult.serverTimeMs !== undefined
                      ? `${downloadResult.serverTimeMs} ms`
                      : 'Not reported by header'}
                  </span>
                </div>
                <div className="vv-kv-row">
                  <span className="vv-kv-key">Client roundtrip elapsed</span>
                  <span className="vv-kv-val vv-mono">{downloadResult.clientDurationMs} ms</span>
                </div>
              </div>
              <p className="vv-files-disclaimer">
                The <code className="vv-code">X-Reconstruction-Shares</code> header reports Shamir
                key shares retrieved under K=3 threshold. Data shard distribution is managed
                internally by the storage cluster and not exposed per-shard in the download response.
              </p>
            </div>

            {/* Right: Cryptographic SHA-256 evidence */}
            <div className="vv-files-result-card">
              <h4 className="vv-files-result-section-title">CRYPTOGRAPHIC INTEGRITY PROOF</h4>

              {/* Status Outcome Banner */}
              {downloadResult.matchStatus === 'verified' && (
                <div className="vv-files-outcome-badge vv-files-outcome-badge--ok">
                  <span className="vv-files-outcome-icon">✓</span>
                  <div>
                    <strong>INTEGRITY VERIFIED — BYTES IDENTICAL</strong>
                    <div className="vv-files-outcome-desc">
                      Client-computed SHA-256 matches the original pre-upload digest bit-for-bit.
                    </div>
                  </div>
                </div>
              )}

              {downloadResult.matchStatus === 'mismatch' && (
                <div className="vv-files-outcome-badge vv-files-outcome-badge--err">
                  <span className="vv-files-outcome-icon">✕</span>
                  <div>
                    <strong>HASH MISMATCH DETECTED</strong>
                    <div className="vv-files-outcome-desc">
                      The downloaded file bytes differ from the baseline pre-upload checksum!
                    </div>
                  </div>
                </div>
              )}

              {downloadResult.matchStatus === 'unverified' && (
                <div className="vv-files-outcome-badge vv-files-outcome-badge--warn">
                  <span className="vv-files-outcome-icon">?</span>
                  <div>
                    <strong>NOT VERIFIED — BASELINE UNAVAILABLE</strong>
                    <div className="vv-files-outcome-desc">
                      Downloaded payload hashed successfully, but no original pre-upload digest was
                      recorded in this browser session.
                    </div>
                  </div>
                </div>
              )}

              {/* Hashes comparison */}
              <div className="vv-stack" style={{ gap: 8, marginTop: 12 }}>
                <div className="vv-files-hash-row">
                  <div className="vv-files-hash-label">
                    <span>Downloaded File SHA-256 (Web Crypto)</span>
                    <button
                      type="button"
                      className="vv-files-copy-btn"
                      onClick={() => handleCopy(downloadResult.downloadedSha256, 'down-hash')}
                      aria-label="Copy downloaded SHA-256"
                    >
                      {copiedHashKey === 'down-hash' ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>
                  <div className="vv-files-hash-code">
                    {downloadResult.downloadedSha256 || 'Computation unavailable'}
                  </div>
                </div>

                <div className="vv-files-hash-row">
                  <div className="vv-files-hash-label">
                    <span>
                      Original Baseline SHA-256{' '}
                      {downloadResult.baselineSource === 'session'
                        ? '(Session cache)'
                        : downloadResult.baselineSource === 'api'
                        ? '(Server record)'
                        : ''}
                    </span>
                    {downloadResult.baselineSha256 && (
                      <button
                        type="button"
                        className="vv-files-copy-btn"
                        onClick={() =>
                          handleCopy(downloadResult.baselineSha256 || '', 'base-hash')
                        }
                        aria-label="Copy baseline SHA-256"
                      >
                        {copiedHashKey === 'base-hash' ? 'Copied ✓' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <div className="vv-files-hash-code">
                    {downloadResult.baselineSha256 ||
                      '— Baseline not recorded in this browser session'}
                  </div>
                </div>
              </div>

              {/* Verification Navigation Action */}
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                {onNavigate && (
                  <button
                    type="button"
                    id="vv-files-open-verification-btn"
                    className="vv-btn vv-btn--primary vv-btn--sm"
                    onClick={() => onNavigate('verification')}
                  >
                    Open Verification Section →
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Files Table or Empty States ─────────────────────────────── */}
      {isLoading && files.length === 0 ? (
        <div className="vv-panel" style={{ padding: 32, textAlign: 'center' }}>
          <TechnicalLoader label="Querying coordinator file registry…" />
        </div>
      ) : files.length === 0 ? (
        <div className="vv-panel vv-files-empty-state">
          <div className="vv-files-empty-icon">📁</div>
          <p className="vv-files-empty-title">— No files stored in the vault yet.</p>
          <p className="vv-text-muted" style={{ fontSize: 13, maxWidth: 440, margin: '8px auto 16px' }}>
            Encrypt and distribute files across the storage cluster using Shamir Secret Sharing
            and Reed-Solomon erasure coding.
          </p>
          {onNavigate && (
            <button
              type="button"
              className="vv-btn vv-btn--primary"
              onClick={() => onNavigate('upload')}
            >
              Upload a File →
            </button>
          )}
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="vv-panel vv-files-empty-state">
          <p className="vv-files-empty-title">
            No files matched your filter query &ldquo;{searchQuery}&rdquo;
          </p>
          <p className="vv-text-muted" style={{ fontSize: 13, marginTop: 6, marginBottom: 12 }}>
            Try searching with a different term or clear the filter.
          </p>
          <button
            type="button"
            className="vv-btn vv-btn--sm"
            onClick={() => setSearchQuery('')}
          >
            Clear Filter
          </button>
        </div>
      ) : (
        <div className="vv-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="vv-files-table-wrapper">
            <table className="vv-table vv-files-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>File Name &amp; Type</th>
                  <th style={{ width: '12%' }}>Size</th>
                  <th style={{ width: '16%' }}>Uploaded Time</th>
                  <th style={{ width: '12%' }}>Status</th>
                  <th style={{ width: '18%' }}>Checksum / ID</th>
                  <th style={{ width: '14%', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((file) => {
                  const isDownloading = downloadingId === file.id;
                  const err = downloadErrors[file.id];
                  const sessionChecksum =
                    file.checksumSha256 ||
                    (typeof window !== 'undefined'
                      ? sessionStorage.getItem(`vv_checksum_${file.id}`)
                      : null);
                  const isRevealed = !!revealedHashes[file.id];

                  return (
                    <React.Fragment key={file.id}>
                      <tr
                        className={`vv-files-row ${
                          isDownloading ? 'vv-files-row--active' : ''
                        }`}
                      >
                        {/* Filename & MIME */}
                        <td>
                          <div className="vv-files-name-wrap">
                            <span className="vv-files-filename" title={file.filename}>
                              {file.filename}
                            </span>
                            <div className="vv-files-meta-badges">
                              <span className="vv-badge vv-badge--neutral">
                                {mimeLabel(file.mimeType)}
                              </span>
                              <span className="vv-files-fileid" title={`ID: ${file.id}`}>
                                id:{file.id.slice(0, 8)}…
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Size */}
                        <td>
                          <span className="vv-mono" style={{ fontSize: 12 }}>
                            {fmtBytes(file.sizeBytes)}
                          </span>
                        </td>

                        {/* Uploaded Timestamp */}
                        <td>
                          <div className="vv-files-time-wrap">
                            <span
                              className="vv-text-muted"
                              style={{ fontSize: 12 }}
                              title={fmtTimestamp(file.createdAt)}
                            >
                              {fmtRelativeTime(file.createdAt)}
                            </span>
                            <span className="vv-files-time-exact">
                              {fmtTimestamp(file.createdAt)}
                            </span>
                          </div>
                        </td>

                        {/* Real Status */}
                        <td>
                          <span
                            className={`vv-badge ${
                              file.status === 'DISTRIBUTED' || file.status === 'UPLOADED'
                                ? 'vv-badge--online'
                                : file.status === 'DEGRADED'
                                ? 'vv-badge--warn'
                                : 'vv-badge--neutral'
                            }`}
                          >
                            {file.status || 'DISTRIBUTED'}
                          </span>
                        </td>

                        {/* Checksum / Hash fingerprint */}
                        <td>
                          {sessionChecksum ? (
                            <div className="vv-files-hash-cell">
                              <span
                                className="vv-text-code"
                                style={{ fontSize: 11, cursor: 'pointer' }}
                                title={sessionChecksum}
                                onClick={() => toggleReveal(file.id)}
                              >
                                {isRevealed
                                  ? sessionChecksum
                                  : truncHash(sessionChecksum, 6, 6)}
                              </span>
                              <button
                                type="button"
                                className="vv-files-mini-copy"
                                onClick={() => handleCopy(sessionChecksum, `row-${file.id}`)}
                                title="Copy full SHA-256 hash"
                                aria-label="Copy SHA-256"
                              >
                                {copiedHashKey === `row-${file.id}` ? '✓' : '⧉'}
                              </button>
                            </div>
                          ) : (
                            <span
                              className="vv-text-muted"
                              style={{ fontSize: 11, fontStyle: 'italic' }}
                              title="Original digest not preserved in current session"
                            >
                              — unavailable
                            </span>
                          )}
                        </td>

                        {/* Action: Reconstruct & Download */}
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            id={`vv-download-${file.id}`}
                            className="vv-btn vv-btn--sm vv-btn--primary vv-files-download-btn"
                            disabled={isDownloading || downloadingId !== null}
                            onClick={() => handleDownload(file)}
                          >
                            {isDownloading ? (
                              <>
                                <span className="vv-files-btn-pulse" />
                                Reconstructing…
                              </>
                            ) : (
                              '↓ Reconstruct'
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Inline error row if download fails for this file */}
                      {err && (
                        <tr className="vv-files-err-row">
                          <td colSpan={6}>
                            <div className="vv-msg vv-msg--err">
                              <strong>Download Error:</strong> {err}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
