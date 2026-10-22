import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StorageNodeInfo {
  id: string;
  name: string;
  host: string;
  port: number;
  status: string;
  isHealthy: boolean;
}

interface UploadResult {
  fileId: string;
  filename?: string;
  checksumSha256?: string;
  sharesDistributed?: number;
  chunksDistributed?: number;
  kThreshold?: number;
  nShares?: number;
}

type UploadPhase = 'idle' | 'hashing' | 'uploading' | 'complete' | 'error';

interface UploadSectionProps {
  authToken: string;
  nodes: StorageNodeInfo[];
  onUploadSuccess: () => void;
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

function mimeLabel(mime: string): string {
  if (!mime) return 'application/octet-stream';
  return mime;
}

function truncHash(hash: string, len = 16): string {
  if (hash.length <= len * 2 + 1) return hash;
  return `${hash.slice(0, len)}…${hash.slice(-len)}`;
}

async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Binary / ciphertext animation frames (decorative only)
// ─────────────────────────────────────────────────────────────────────────────

const CIPHER_FRAMES = [
  'A7 C1 09 F2 3B E8 5D 14 6A 90 B3 D7 2F 48 C5',
  'E8 5D 14 A7 90 B3 6A C1 2F 48 D7 09 F2 3B C5',
  '14 6A 90 E8 C1 2F 5D 48 D7 A7 09 B3 C5 F2 3B',
  '90 B3 D7 14 48 C5 6A 2F A7 E8 3B 09 F2 5D C1',
  '2F 48 C5 90 09 F2 D7 3B E8 14 C1 6A B3 A7 5D',
];

const BINARY_FRAMES = [
  '01001101 10110010 00110101 11001010 01110011',
  '10110010 01001101 11001010 00110101 10010110',
  '00110101 11001010 01001101 10110010 11010011',
  '11001010 00110101 10110010 01001101 00101100',
];

function ProcessingAnimation({ phase }: { phase: 'hashing' | 'uploading' }) {
  const [frame, setFrame] = useState(0);
  const frames = phase === 'hashing' ? BINARY_FRAMES : CIPHER_FRAMES;

  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % frames.length), 320);
    return () => clearInterval(t);
  }, [frames.length]);

  return (
    <div className="vv-upload-terminal">
      <div className="vv-upload-terminal__header">
        <span className="vv-upload-terminal__dot vv-upload-terminal__dot--r" />
        <span className="vv-upload-terminal__dot vv-upload-terminal__dot--y" />
        <span className="vv-upload-terminal__dot vv-upload-terminal__dot--g" />
        <span className="vv-upload-terminal__title">
          {phase === 'hashing' ? 'computing sha-256 digest' : 'coordinator processing'}
        </span>
      </div>
      <div className="vv-upload-terminal__body">
        <div className="vv-upload-terminal__line">
          <span className="vv-upload-terminal__prompt">$</span>
          <span>
            {phase === 'hashing'
              ? 'sha256sum --compute plaintext'
              : 'vault encrypt --distribute --scheme aes-256-gcm+sss(3,5)+rs(3,5)'}
          </span>
        </div>
        <div className="vv-upload-terminal__line vv-upload-terminal__line--stream">
          <span className="vv-upload-terminal__prompt">&gt;</span>
          <span className="vv-upload-terminal__cipher">{frames[frame]}</span>
        </div>
        <div className="vv-upload-terminal__line vv-upload-terminal__line--status">
          <span className="vv-upload-terminal__prompt">&gt;</span>
          <span>
            {phase === 'hashing'
              ? 'Reading file buffer and computing digest…'
              : 'Coordinator processing request — encrypt → split key → shard → distribute'}
          </span>
        </div>
      </div>
      <div className="vv-phase-bar vv-phase-bar--indeterminate">
        <div className="vv-phase-bar__fill" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow schematic — shows the processing pipeline (not live progress)
// ─────────────────────────────────────────────────────────────────────────────

const WORKFLOW_STAGES = [
  { id: 'encrypt', label: 'AES-256-GCM Encryption', detail: 'Encrypt file contents with generated key' },
  { id: 'erasure', label: 'Reed-Solomon RS(3,5)', detail: 'Encode encrypted data into 5 shards (3 required)' },
  { id: 'shamir', label: 'Shamir Secret Sharing K=3/N=5', detail: 'Split AES key into 5 shares (3 required)' },
  { id: 'dist', label: 'Distribution', detail: 'Distribute shards and key shares to storage nodes' },
  { id: 'meta', label: 'Metadata Persistence', detail: 'Store file record and distribution metadata' },
];

function WorkflowSchematic({ phase, result }: { phase: UploadPhase; result: UploadResult | null }) {
  return (
    <div className="vv-upload-workflow">
      <div className="vv-upload-workflow__header">
        <span className="vv-label">Processing pipeline</span>
        {phase === 'uploading' && (
          <span className="vv-badge vv-badge--warn">Processing</span>
        )}
        {phase === 'complete' && result && (
          <span className="vv-badge vv-badge--online">Confirmed</span>
        )}
      </div>
      <div className="vv-upload-workflow__stages">
        {WORKFLOW_STAGES.map((stage, i) => {
          const isConfirmed = phase === 'complete' && result;
          const isPending = phase === 'uploading';
          return (
            <div
              key={stage.id}
              className={`vv-upload-workflow__stage ${
                isConfirmed
                  ? 'vv-upload-workflow__stage--done'
                  : isPending
                  ? 'vv-upload-workflow__stage--pending'
                  : ''
              }`}
            >
              <div className="vv-upload-workflow__stage-num">
                {isConfirmed ? '✓' : String(i + 1)}
              </div>
              <div className="vv-upload-workflow__stage-body">
                <span className="vv-upload-workflow__stage-label">{stage.label}</span>
                <span className="vv-upload-workflow__stage-detail">{stage.detail}</span>
              </div>
            </div>
          );
        })}
      </div>
      {phase === 'uploading' && (
        <p className="vv-upload-workflow__note">
          The backend processes all stages in a single synchronous request.
          Individual stage progress is not streamed — completion is confirmed on response.
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shard distribution visualization
// ─────────────────────────────────────────────────────────────────────────────

function ShardDistribution({
  nodes,
  result,
}: {
  nodes: StorageNodeInfo[];
  result: UploadResult;
}) {
  // Use exactly 5 node slots, fill with real nodes where available
  const displayNodes = useMemo(() => {
    const slots: (StorageNodeInfo | null)[] = [];
    for (let i = 0; i < 5; i++) {
      slots.push(nodes[i] || null);
    }
    return slots;
  }, [nodes]);

  return (
    <div className="vv-shard-dist">
      <div className="vv-shard-dist__header">
        <span className="vv-label">Shard distribution</span>
        <span className="vv-badge vv-badge--online">Distribution complete</span>
      </div>

      {/* Central file block */}
      <div className="vv-shard-dist__center">
        <div className="vv-shard-dist__file-block">
          <div className="vv-shard-dist__file-icon" aria-hidden="true">◉</div>
          <div className="vv-shard-dist__file-info">
            <span className="vv-shard-dist__file-name">
              {result.filename || result.fileId.slice(0, 12) + '…'}
            </span>
            <span className="vv-shard-dist__file-tag">Encrypted &amp; Split</span>
          </div>
        </div>
      </div>

      {/* Connection lines + node cards */}
      <div className="vv-shard-dist__lines" aria-hidden="true">
        {displayNodes.map((_, i) => (
          <div key={i} className="vv-shard-dist__line vv-shard-dist__line--animated" />
        ))}
      </div>

      <div className="vv-shard-dist__nodes">
        {displayNodes.map((node, i) => (
          <div
            key={node?.id || `slot-${i}`}
            className={`vv-shard-dist__node ${
              node
                ? node.isHealthy
                  ? 'vv-shard-dist__node--online'
                  : 'vv-shard-dist__node--offline'
                : 'vv-shard-dist__node--unknown'
            }`}
          >
            <span
              className={`vv-status-dot ${
                node
                  ? node.isHealthy
                    ? 'vv-status-dot--online'
                    : 'vv-status-dot--offline'
                  : 'vv-status-dot--warn'
              }`}
            />
            <span className="vv-shard-dist__node-name">
              {node ? node.name : `Node ${i + 1}`}
            </span>
            <span className="vv-shard-dist__node-status">
              {node ? (node.isHealthy ? 'Online' : 'Offline') : 'Unknown'}
            </span>
          </div>
        ))}
      </div>

      {/* Distribution details */}
      <div className="vv-shard-dist__details">
        <div className="vv-kv-row">
          <span className="vv-kv-key">Algorithm</span>
          <span className="vv-kv-val vv-text-code">AES-256-GCM + Shamir SSS + Reed-Solomon</span>
        </div>
        <div className="vv-kv-row">
          <span className="vv-kv-key">Key share threshold</span>
          <span className="vv-kv-val vv-text-code">
            K={result.kThreshold ?? 3} / N={result.nShares ?? 5}
          </span>
        </div>
        {result.sharesDistributed !== undefined && (
          <div className="vv-kv-row">
            <span className="vv-kv-key">Key shares distributed</span>
            <span className="vv-kv-val vv-text-code">{result.sharesDistributed}</span>
          </div>
        )}
        {result.chunksDistributed !== undefined && (
          <div className="vv-kv-row">
            <span className="vv-kv-key">Data shards distributed</span>
            <span className="vv-kv-val vv-text-code">{result.chunksDistributed}</span>
          </div>
        )}
        {result.checksumSha256 && (
          <div className="vv-kv-row">
            <span className="vv-kv-key">Server checksum (SHA-256)</span>
            <span
              className="vv-kv-val vv-text-code"
              style={{ fontSize: 10, wordBreak: 'break-all' }}
              title={result.checksumSha256}
            >
              {truncHash(result.checksumSha256)}
            </span>
          </div>
        )}
      </div>

      <p className="vv-shard-dist__caveat">
        This visualization is schematic. The current API confirms aggregate distribution
        counts but does not expose confirmed per-node shard placement.
        Node states reflect live health data from <code className="vv-code">/api/nodes</code>.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Upload section
// ─────────────────────────────────────────────────────────────────────────────

export function UploadSection({ authToken, nodes, onUploadSuccess }: UploadSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [sourceHash, setSourceHash] = useState<string | null>(null);
  const [hashError, setHashError] = useState<string | null>(null);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadDuration, setUploadDuration] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute SHA-256 when a file is selected
  useEffect(() => {
    if (!selectedFile) {
      setSourceHash(null);
      setHashError(null);
      return;
    }

    let cancelled = false;
    setSourceHash(null);
    setHashError(null);

    if (!crypto?.subtle?.digest) {
      setHashError('Web Crypto API unavailable (requires HTTPS or localhost)');
      return;
    }

    setPhase('hashing');
    computeSha256(selectedFile)
      .then((hash) => {
        if (!cancelled) {
          setSourceHash(hash);
          setPhase('idle');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setHashError(err instanceof Error ? err.message : 'SHA-256 computation failed');
          setPhase('idle');
        }
      });

    return () => { cancelled = true; };
  }, [selectedFile]);

  const handleFileSelect = useCallback((file: File | null) => {
    setSelectedFile(file);
    setUploadResult(null);
    setErrorMsg('');
    setUploadDuration(null);
    setPhase('idle');
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0] || null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setPhase('uploading');
    setErrorMsg('');
    setUploadResult(null);
    setUploadDuration(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    // Backend ignores kThreshold/nShares (hardcoded K=3, N=5); sent for compatibility.
    formData.append('kThreshold', '3');
    formData.append('nShares', '5');

    const startTime = performance.now();

    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      });

      const elapsed = Math.round(performance.now() - startTime);
      setUploadDuration(elapsed);

      if (res.ok) {
        const data = await res.json();
        const result: UploadResult = {
          fileId: data.fileId,
          filename: data.filename ?? selectedFile.name,
          checksumSha256: data.checksumSha256,
          sharesDistributed: data.sharesDistributed,
          chunksDistributed: data.chunksDistributed,
          kThreshold: data.kThreshold,
          nShares: data.nShares,
        };
        setUploadResult(result);
        setPhase('complete');
        // Scoped browser session storage for baseline SHA-256 digest
        const hashToSave = data.checksumSha256 || sourceHash;
        if (data.fileId && hashToSave) {
          try {
            sessionStorage.setItem(`vv_checksum_${data.fileId}`, hashToSave);
          } catch {
            /* ignore storage access restrictions */
          }
        }
        onUploadSuccess();
      } else {
        let errText = 'Upload failed.';
        try {
          const err = await res.json();
          errText = err.error || errText;
        } catch {
          errText = `Upload failed with status ${res.status}`;
        }
        setErrorMsg(errText);
        setPhase('error');
      }
    } catch (err: unknown) {
      setUploadDuration(Math.round(performance.now() - startTime));
      setErrorMsg(err instanceof Error ? err.message : 'Upload request failed.');
      setPhase('error');
    }
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // clipboard API may be unavailable
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setPhase('idle');
    setErrorMsg('');
    setSourceHash(null);
    setUploadDuration(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // SHA-256 comparison between client-computed and server-returned
  const hashComparison = useMemo(() => {
    if (!sourceHash || !uploadResult?.checksumSha256) return null;
    const clientHash = sourceHash.toLowerCase();
    const serverHash = uploadResult.checksumSha256.toLowerCase();
    return {
      match: clientHash === serverHash,
      client: clientHash,
      server: serverHash,
    };
  }, [sourceHash, uploadResult]);

  const isProcessing = phase === 'hashing' || phase === 'uploading';

  return (
    <>
      <div className="vv-section-header">
        <span className="vv-section-title">Upload</span>
        <span className="vv-section-subtitle">Encrypt &amp; distribute a file to the vault</span>
        {phase === 'complete' && (
          <button
            className="vv-btn vv-btn--sm"
            style={{ marginLeft: 'auto' }}
            onClick={handleReset}
          >
            ↻ New Upload
          </button>
        )}
      </div>

      {/* ── Idle / File selection view ──────────────────────────────── */}
      {(phase === 'idle' || phase === 'hashing' || phase === 'error') && (
        <div className="vv-upload-layout">
          {/* Left column: file selection + metadata */}
          <div className="vv-upload-left">
            <form onSubmit={handleUpload} className="vv-stack">
              {/* Drop zone */}
              <div
                className={`vv-upload-dropzone ${
                  isDragOver ? 'vv-upload-dropzone--hover' : ''
                } ${selectedFile ? 'vv-upload-dropzone--has-file' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Select file to upload"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  id="vv-file-input"
                  type="file"
                  onChange={handleInputChange}
                  style={{ display: 'none' }}
                />
                {selectedFile ? (
                  <div className="vv-upload-dropzone__selected">
                    <div className="vv-upload-dropzone__file-icon" aria-hidden="true">▣</div>
                    <div className="vv-upload-dropzone__file-meta">
                      <span className="vv-upload-dropzone__filename">{selectedFile.name}</span>
                      <span className="vv-upload-dropzone__filedetail">
                        {fmtBytes(selectedFile.size)} · {mimeLabel(selectedFile.type)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="vv-upload-dropzone__empty">
                    <div className="vv-upload-dropzone__icon" aria-hidden="true">⇧</div>
                    <span className="vv-upload-dropzone__title">Drop your file here</span>
                    <span className="vv-upload-dropzone__sub">or click to browse</span>
                  </div>
                )}
              </div>

              {/* SHA-256 fingerprint */}
              {selectedFile && (
                <div className="vv-upload-hash-panel">
                  <div className="vv-upload-hash-panel__header">
                    <span className="vv-label">Source SHA-256 fingerprint</span>
                    {phase === 'hashing' && (
                      <span className="vv-badge vv-badge--warn">Computing…</span>
                    )}
                    {sourceHash && (
                      <button
                        type="button"
                        className="vv-btn vv-btn--sm"
                        onClick={(e) => { e.stopPropagation(); handleCopy(sourceHash, 'source-hash'); }}
                      >
                        {copiedField === 'source-hash' ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  {phase === 'hashing' && <ProcessingAnimation phase="hashing" />}
                  {sourceHash && (
                    <code className="vv-upload-hash-panel__value" title={sourceHash}>
                      {sourceHash}
                    </code>
                  )}
                  {hashError && (
                    <div className="vv-msg vv-msg--err">{hashError}</div>
                  )}
                </div>
              )}

              {/* Error state */}
              {phase === 'error' && errorMsg && (
                <div className="vv-msg vv-msg--err">{errorMsg}</div>
              )}

              {/* Encryption scheme strip */}
              <div className="vv-upload-scheme">
                <div className="vv-upload-scheme__item">
                  <span className="vv-upload-scheme__k">CIPHER</span>
                  <span className="vv-upload-scheme__v">AES-256-GCM</span>
                </div>
                <div className="vv-upload-scheme__item">
                  <span className="vv-upload-scheme__k">KEY SPLIT</span>
                  <span className="vv-upload-scheme__v">SSS K=3/N=5</span>
                </div>
                <div className="vv-upload-scheme__item">
                  <span className="vv-upload-scheme__k">DATA</span>
                  <span className="vv-upload-scheme__v">RS(3,5)</span>
                </div>
                <div className="vv-upload-scheme__item">
                  <span className="vv-upload-scheme__k">TOLERANCE</span>
                  <span className="vv-upload-scheme__v">2 nodes</span>
                </div>
              </div>

              {/* Submit button */}
              <button
                id="vv-upload-btn"
                type="submit"
                className="vv-btn vv-btn--primary vv-upload-submit"
                disabled={!selectedFile || isProcessing || !sourceHash}
              >
                {phase === 'hashing'
                  ? 'Computing SHA-256…'
                  : !selectedFile
                  ? 'Select a file to begin'
                  : 'Encrypt & Distribute →'}
              </button>
              <p className="vv-upload-submit-note">
                File can be recovered even if up to 2 nodes fail.
                Backend uses fixed K=3/N=5 — these values are not configurable.
              </p>
            </form>
          </div>

          {/* Right column: workflow schematic */}
          <div className="vv-upload-right">
            <WorkflowSchematic phase={phase} result={uploadResult} />
          </div>
        </div>
      )}

      {/* ── Processing view ────────────────────────────────────────── */}
      {phase === 'uploading' && (
        <div className="vv-upload-processing">
          {/* File being processed */}
          {selectedFile && (
            <div className="vv-upload-processing__file">
              <div className="vv-kv-row">
                <span className="vv-kv-key">Processing file</span>
                <span className="vv-kv-val vv-text-code">{selectedFile.name}</span>
              </div>
              <div className="vv-kv-row">
                <span className="vv-kv-key">Size</span>
                <span className="vv-kv-val">{fmtBytes(selectedFile.size)}</span>
              </div>
              {sourceHash && (
                <div className="vv-kv-row">
                  <span className="vv-kv-key">Source SHA-256</span>
                  <span className="vv-kv-val vv-text-code" style={{ fontSize: 10 }}>
                    {truncHash(sourceHash)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Terminal-style processing view */}
          <ProcessingAnimation phase="uploading" />

          {/* Workflow schematic in pending state */}
          <WorkflowSchematic phase={phase} result={null} />
        </div>
      )}

      {/* ── Complete view ──────────────────────────────────────────── */}
      {phase === 'complete' && uploadResult && (
        <div className="vv-upload-complete">
          {/* Success banner */}
          <div className="vv-msg vv-msg--ok">
            File encrypted, split, and distributed successfully.
          </div>

          {/* Result details */}
          <div className="vv-upload-result">
            <div className="vv-upload-result__header">
              <span className="vv-label">Upload result</span>
              {uploadDuration !== null && (
                <span className="vv-badge vv-badge--neutral">
                  {uploadDuration} ms (client-observed)
                </span>
              )}
            </div>
            <div className="vv-upload-result__body">
              <div className="vv-kv-row">
                <span className="vv-kv-key">File ID</span>
                <span className="vv-kv-val vv-text-code" style={{ fontSize: 10 }}>
                  {uploadResult.fileId}
                  <button
                    type="button"
                    className="vv-btn vv-btn--sm"
                    style={{ marginLeft: 8 }}
                    onClick={() => handleCopy(uploadResult.fileId, 'fileId')}
                  >
                    {copiedField === 'fileId' ? '✓' : 'Copy'}
                  </button>
                </span>
              </div>
              <div className="vv-kv-row">
                <span className="vv-kv-key">Filename</span>
                <span className="vv-kv-val">{uploadResult.filename || '—'}</span>
              </div>
              {uploadResult.kThreshold !== undefined && (
                <div className="vv-kv-row">
                  <span className="vv-kv-key">Threshold (K / N)</span>
                  <span className="vv-kv-val vv-text-code">
                    {uploadResult.kThreshold} / {uploadResult.nShares}
                  </span>
                </div>
              )}
              {uploadResult.sharesDistributed !== undefined && (
                <div className="vv-kv-row">
                  <span className="vv-kv-key">Key shares distributed</span>
                  <span className="vv-kv-val vv-text-code">{uploadResult.sharesDistributed}</span>
                </div>
              )}
              {uploadResult.chunksDistributed !== undefined && (
                <div className="vv-kv-row">
                  <span className="vv-kv-key">Data shards distributed</span>
                  <span className="vv-kv-val vv-text-code">{uploadResult.chunksDistributed}</span>
                </div>
              )}
            </div>
          </div>

          {/* Hash comparison */}
          <div className="vv-upload-integrity">
            <div className="vv-upload-integrity__header">
              <span className="vv-label">Integrity comparison (SHA-256)</span>
              {hashComparison ? (
                hashComparison.match ? (
                  <span className="vv-badge vv-badge--online">Match</span>
                ) : (
                  <span className="vv-badge vv-badge--offline">Mismatch</span>
                )
              ) : (
                <span className="vv-badge vv-badge--neutral">
                  {sourceHash ? 'Server hash unavailable' : 'Source hash unavailable'}
                </span>
              )}
            </div>
            <div className="vv-upload-integrity__body">
              <div className="vv-upload-integrity__row">
                <span className="vv-upload-integrity__label">Client-computed (plaintext)</span>
                <code
                  className="vv-upload-integrity__hash"
                  title={sourceHash || undefined}
                >
                  {sourceHash || 'Not computed'}
                </code>
                {sourceHash && (
                  <button
                    type="button"
                    className="vv-btn vv-btn--sm"
                    onClick={() => handleCopy(sourceHash, 'client-hash')}
                  >
                    {copiedField === 'client-hash' ? '✓' : 'Copy'}
                  </button>
                )}
              </div>
              <div className="vv-upload-integrity__row">
                <span className="vv-upload-integrity__label">Server-returned (checksumSha256)</span>
                <code
                  className="vv-upload-integrity__hash"
                  title={uploadResult.checksumSha256 || undefined}
                >
                  {uploadResult.checksumSha256 || 'Not returned by API'}
                </code>
                {uploadResult.checksumSha256 && (
                  <button
                    type="button"
                    className="vv-btn vv-btn--sm"
                    onClick={() => handleCopy(uploadResult.checksumSha256!, 'server-hash')}
                  >
                    {copiedField === 'server-hash' ? '✓' : 'Copy'}
                  </button>
                )}
              </div>
            </div>
            {hashComparison && !hashComparison.match && (
              <div className="vv-msg vv-msg--err" style={{ marginTop: 8 }}>
                SHA-256 mismatch between client-computed plaintext hash and server-returned checksum.
                This may indicate the server computed the hash on different data.
              </div>
            )}
          </div>

          {/* Shard distribution visualization */}
          <ShardDistribution nodes={nodes} result={uploadResult} />

          {/* Confirmed workflow */}
          <WorkflowSchematic phase={phase} result={uploadResult} />
        </div>
      )}
    </>
  );
}
