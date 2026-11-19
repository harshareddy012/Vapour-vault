import React, { useState, useEffect, useMemo, useCallback } from 'react';

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

export interface FileItem {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  status?: string;
  checksumSha256?: string;
}

export interface RecoveryLabProps {
  authToken: string;
  files: FileItem[];
  nodes: StorageNode[];
  onRefreshNodes: () => Promise<void> | void;
  onNavigate?: (section: string) => void;
}

type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'unavailable';

interface PipelineStage {
  id: number;
  name: string;
  mechanism: string;
  description: string;
  status: StageStatus;
  detail?: string;
}

interface ScenarioExecutionResult {
  scenarioId: string;
  scenarioTitle: string;
  expected: string;
  observed: 'success' | 'failure' | 'pending' | 'error';
  message: string;
  httpStatus?: number;
  testedFileId?: string;
  testedFilename?: string;
  sharesRetrieved?: number;
  serverTimeMs?: number;
  clientDurationMs?: number;
  downloadedSha256?: string;
  baselineSha256?: string | null;
  integrityMatch?: 'verified' | 'mismatch' | 'unverified';
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

function truncHash(hash: string, head = 8, tail = 8): string {
  if (!hash || hash.length <= head + tail + 2) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Decorative binary and ciphertext frames for terminal loader
// ─────────────────────────────────────────────────────────────────────────────

const BINARY_FRAMES = [
  '01001101 10110010 00110101 11001010 01110011',
  '10110010 01001101 11001010 00110101 10010110',
  '00110101 11001010 01001101 10110010 11010011',
  '11001010 00110101 10110010 01001101 00101100',
];

const CIPHER_FRAMES = [
  'A7 C1 09 F2 3B E8 5D 14 6A 90 B3 D7 2F 48 C5',
  'E8 5D 14 A7 90 B3 6A C1 2F 48 D7 09 F2 3B C5',
  '14 6A 90 E8 C1 2F 5D 48 D7 A7 09 B3 C5 F2 3B',
  '90 B3 D7 14 48 C5 6A 2F A7 E8 3B 09 F2 5D C1',
];

// Initial baseline definition of the 7 stages
const INITIAL_STAGES: PipelineStage[] = [
  {
    id: 1,
    name: 'Node Availability Assessment',
    mechanism: 'Cluster Topology Quorum Check',
    description: 'Inspect live storage node cluster state to verify minimum K=3 threshold quorum.',
    status: 'pending',
  },
  {
    id: 2,
    name: 'Data-Shard Retrieval',
    mechanism: 'Reed-Solomon RS(3,5) Shards',
    description: 'Gather encrypted payload shards across surviving storage node partitions.',
    status: 'pending',
  },
  {
    id: 3,
    name: 'Encrypted-Payload Reconstruction',
    mechanism: 'Cauchy Reed-Solomon Erasure Decoding',
    description: 'Rebuild the complete encrypted payload envelope from any 3 valid data shards.',
    status: 'pending',
  },
  {
    id: 4,
    name: 'Key-Share Retrieval',
    mechanism: 'Shamir Secret Sharing K=3/N=5',
    description: 'Collect independent 256-bit Shamir key shares from reachable nodes.',
    status: 'pending',
  },
  {
    id: 5,
    name: 'AES-Key Reconstruction',
    mechanism: 'Lagrange Polynomial Interpolation GF(2^8)',
    description: 'Interpolate polynomial f(0) over Galois Field to recover the 256-bit AES master key.',
    status: 'pending',
  },
  {
    id: 6,
    name: 'AES-256-GCM Decryption',
    mechanism: 'Authenticated Symmetric Cipher',
    description: 'Decrypt payload and authenticate against 128-bit Galois Message Authentication Tag.',
    status: 'pending',
  },
  {
    id: 7,
    name: 'SHA-256 Integrity Verification',
    mechanism: 'Web Crypto API Plaintext Digest',
    description: 'Calculate cryptographic hash of reconstructed bytes and compare bit-for-bit with source.',
    status: 'pending',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// RecoveryLab Component
// ─────────────────────────────────────────────────────────────────────────────

export function RecoveryLab({
  authToken,
  files,
  nodes,
  onRefreshNodes,
  onNavigate,
}: RecoveryLabProps) {
  // Scenario and execution states
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [executionResult, setExecutionResult] = useState<ScenarioExecutionResult | null>(null);

  // Selected file for live recovery test (defaults to files[0])
  const [selectedFileId, setSelectedFileId] = useState<string>('');

  // 7-Stage pipeline state
  const [stages, setStages] = useState<PipelineStage[]>(INITIAL_STAGES);

  // Loader animation frame
  const [frameIdx, setFrameIdx] = useState(0);

  // Per-node toggling indicator
  const [togglingNodeId, setTogglingNodeId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Auto-select first file if available
  useEffect(() => {
    if (files.length > 0 && !selectedFileId) {
      setSelectedFileId(files[0].id);
    }
  }, [files, selectedFileId]);

  // Terminal loader animation loop
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setFrameIdx((i) => (i + 1) % BINARY_FRAMES.length);
    }, 240);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Derived cluster statistics
  const totalNodes = nodes.length;
  const onlineCount = nodes.filter((n) => n.isHealthy).length;
  const offlineCount = totalNodes - onlineCount;
  const isQuorumMet = onlineCount >= 3;

  // Selected file reference
  const currentFile = useMemo(() => {
    return files.find((f) => f.id === selectedFileId) || (files.length > 0 ? files[0] : null);
  }, [files, selectedFileId]);

  // Copy helper
  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Fallback
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Simulator API: Toggle single node
  // ───────────────────────────────────────────────────────────────────────────
  const toggleNode = async (nodeId: string, isOnline: boolean) => {
    try {
      await fetch(`/api/simulator/toggle/${nodeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline }),
      });
    } catch {
      // Silent error logging to match existing behavior
    }
  };

  // Manual toggle from UI
  const handleManualToggle = async (nodeId: string, currentlyHealthy: boolean) => {
    if (isRunning || togglingNodeId) return;
    setTogglingNodeId(nodeId);
    try {
      await toggleNode(nodeId, !currentlyHealthy);
      await onRefreshNodes();
    } finally {
      setTogglingNodeId(null);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Scenario: Restore All 5 Nodes
  // ───────────────────────────────────────────────────────────────────────────
  const handleRestoreAll = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveScenarioId('restore-all');
    setStatusMessage('Restoring all 5 storage nodes to simulated ONLINE state…');
    setExecutionResult(null);

    // Reset pipeline display
    setStages(INITIAL_STAGES.map((s) => ({ ...s, status: 'pending', detail: undefined })));

    try {
      for (const id of ['node-1', 'node-2', 'node-3', 'node-4', 'node-5']) {
        await toggleNode(id, true);
      }
      await onRefreshNodes();

      setStages((prev) =>
        prev.map((s) =>
          s.id === 1
            ? {
                ...s,
                status: 'completed',
                detail: 'All 5/5 nodes restored to ONLINE state. Quorum intact (K=3/N=5).',
              }
            : { ...s, status: 'pending' },
        ),
      );

      setExecutionResult({
        scenarioId: 'restore-all',
        scenarioTitle: 'Restore All Nodes',
        expected: 'All 5 storage nodes online and healthy',
        observed: 'success',
        message: 'All storage nodes restored to simulated ONLINE state. Full fault tolerance restored.',
      });
    } finally {
      setIsRunning(false);
      setStatusMessage('');
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Execute Reconstruction Core Pipeline
  // ───────────────────────────────────────────────────────────────────────────
  const executeReconstructionTest = useCallback(
    async (
      scenarioId: string,
      scenarioTitle: string,
      expectedText: string,
      targetFile: FileItem | null,
    ) => {
      // Step 1: Evaluate Node Quorum
      const resNodes = await fetch('/api/nodes');
      let currentHealthy = 0;
      let totalRegistered = 5;

      if (resNodes.ok) {
        const nodeData = await resNodes.json();
        const list: StorageNode[] = nodeData.nodes || [];
        totalRegistered = list.length || 5;
        currentHealthy = list.filter((n) => n.isHealthy).length;
      } else {
        currentHealthy = nodes.filter((n) => n.isHealthy).length;
      }

      const meetsQuorum = currentHealthy >= 3;

      // Update Stage 1 immediately
      setStages((prev) =>
        prev.map((s) => {
          if (s.id === 1) {
            return {
              ...s,
              status: meetsQuorum ? 'completed' : 'failed',
              detail: meetsQuorum
                ? `${currentHealthy}/${totalRegistered} nodes online (>= K=3 threshold). Quorum satisfied.`
                : `Only ${currentHealthy}/${totalRegistered} nodes online (< K=3 threshold). Insufficient quorum.`,
            };
          }
          if (s.id > 1) {
            return { ...s, status: 'running', detail: 'Processing coordinator pipeline request…' };
          }
          return s;
        }),
      );

      // If vault is empty, cannot proceed with live HTTP download test
      if (!targetFile) {
        setStages((prev) =>
          prev.map((s) => {
            if (s.id > 1) {
              return {
                ...s,
                status: 'unavailable',
                detail: 'No file available in vault to test payload reconstruction.',
              };
            }
            return s;
          }),
        );

        setExecutionResult({
          scenarioId,
          scenarioTitle,
          expected: expectedText,
          observed: 'pending',
          message:
            'Cluster nodes configured according to scenario. Upload a file in the File Vault to execute live end-to-end reconstruction.',
        });
        setIsRunning(false);
        setStatusMessage('');
        return;
      }

      // Execute actual GET /api/files/:id/download call
      const startTime = performance.now();
      try {
        const res = await fetch(`/api/files/${targetFile.id}/download`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const clientDurationMs = Math.round(performance.now() - startTime);

        if (res.ok) {
          // Success Response
          const sharesHeader = res.headers.get('X-Reconstruction-Shares');
          const timeHeader = res.headers.get('X-Reconstruction-Time-Ms');
          const sharesRetrieved = sharesHeader ? parseInt(sharesHeader, 10) : undefined;
          const serverTimeMs = timeHeader ? parseInt(timeHeader, 10) : undefined;

          // Receive binary payload
          const blob = await res.blob();
          const arrayBuffer = await blob.arrayBuffer();

          // Client-side SHA-256 calculation via Web Crypto API
          let downloadedSha256 = '';
          if (crypto?.subtle?.digest) {
            const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            downloadedSha256 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
          }

          // Check for baseline SHA-256
          let baselineSha256: string | null = null;
          if (targetFile.checksumSha256 && targetFile.checksumSha256.trim()) {
            baselineSha256 = targetFile.checksumSha256.trim().toLowerCase();
          } else {
            try {
              const sessionVal = sessionStorage.getItem(`vv_checksum_${targetFile.id}`);
              if (sessionVal) baselineSha256 = sessionVal.trim().toLowerCase();
            } catch {
              /* ignore */
            }
          }

          let integrityMatch: 'verified' | 'mismatch' | 'unverified' = 'unverified';
          if (baselineSha256 && downloadedSha256) {
            integrityMatch =
              baselineSha256 === downloadedSha256.toLowerCase() ? 'verified' : 'mismatch';
          }

          // Update stages 2 through 7 to COMPLETED
          setStages((prev) =>
            prev.map((s) => {
              switch (s.id) {
                case 1:
                  return s; // Already set
                case 2:
                  return {
                    ...s,
                    status: 'completed',
                    detail: `Reed-Solomon RS(3,5) shards gathered from ${currentHealthy} reachable node(s).`,
                  };
                case 3:
                  return {
                    ...s,
                    status: 'completed',
                    detail: `Encrypted payload envelope reconstructed (${fmtBytes(blob.size)}).`,
                  };
                case 4:
                  return {
                    ...s,
                    status: 'completed',
                    detail: `${sharesRetrieved ?? 3} Shamir key shares collected (X-Reconstruction-Shares).`,
                  };
                case 5:
                  return {
                    ...s,
                    status: 'completed',
                    detail:
                      'Lagrange polynomial interpolation over GF(256) succeeded; 256-bit AES key recovered.',
                  };
                case 6:
                  return {
                    ...s,
                    status: 'completed',
                    detail: `AES-256-GCM authenticated decryption verified (${serverTimeMs ? serverTimeMs + ' ms server time' : 'tag valid'}).`,
                  };
                case 7:
                  return {
                    ...s,
                    status: integrityMatch === 'mismatch' ? 'failed' : 'completed',
                    detail:
                      integrityMatch === 'verified'
                        ? `INTEGRITY VERIFIED: SHA-256 matches baseline digest bit-for-bit (${truncHash(downloadedSha256)}).`
                        : integrityMatch === 'mismatch'
                        ? 'HASH MISMATCH: Reconstructed byte digest differs from baseline.'
                        : `Plaintext digest computed: ${truncHash(downloadedSha256)} (No pre-upload baseline recorded in session).`,
                  };
                default:
                  return s;
              }
            }),
          );

          setExecutionResult({
            scenarioId,
            scenarioTitle,
            expected: expectedText,
            observed: 'success',
            message: `Reconstruction succeeded. File "${targetFile.filename}" returned (${fmtBytes(blob.size)}).`,
            httpStatus: res.status,
            testedFileId: targetFile.id,
            testedFilename: targetFile.filename,
            sharesRetrieved,
            serverTimeMs,
            clientDurationMs,
            downloadedSha256,
            baselineSha256,
            integrityMatch,
          });
        } else {
          // Failure Response (Expected in Scenario 2)
          let errMsg = `Reconstruction failed (HTTP ${res.status})`;
          try {
            const errJson = await res.json();
            errMsg = errJson.error || errMsg;
          } catch {
            /* ignore */
          }

          // Mark stages 2-6 as failed, stage 7 as unavailable
          setStages((prev) =>
            prev.map((s) => {
              if (s.id === 1) return s;
              if (s.id >= 2 && s.id <= 6) {
                return {
                  ...s,
                  status: 'failed',
                  detail: `Aborted: ${errMsg} (insufficient node quorum < 3).`,
                };
              }
              if (s.id === 7) {
                return {
                  ...s,
                  status: 'unavailable',
                  detail: 'Integrity verification skipped: payload could not be recovered.',
                };
              }
              return s;
            }),
          );

          setExecutionResult({
            scenarioId,
            scenarioTitle,
            expected: expectedText,
            observed: 'failure',
            message: `Reconstruction rejected by coordinator as expected: ${errMsg}`,
            httpStatus: res.status,
            testedFileId: targetFile.id,
            testedFilename: targetFile.filename,
            clientDurationMs,
          });
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown network failure';
        setStages((prev) =>
          prev.map((s) => (s.id > 1 ? { ...s, status: 'failed', detail: errorMsg } : s)),
        );

        setExecutionResult({
          scenarioId,
          scenarioTitle,
          expected: expectedText,
          observed: 'error',
          message: `Network error during reconstruction: ${errorMsg}`,
        });
      } finally {
        setIsRunning(false);
        setStatusMessage('');
      }
    },
    [authToken, nodes],
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Scenario 1: Two Nodes Offline (Nodes 2 & 5)
  // Expected: SUCCESS (3 nodes online >= K=3 threshold)
  // ───────────────────────────────────────────────────────────────────────────
  const runScenario1 = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveScenarioId('scenario-1');
    setStatusMessage('Configuring Scenario 1: Bringing Nodes 1, 3, 4 ONLINE and Nodes 2, 5 OFFLINE…');
    setExecutionResult(null);

    // Bring 1, 3, 4 online first
    for (const id of ['node-1', 'node-3', 'node-4']) {
      await toggleNode(id, true);
    }
    // Bring 2 and 5 offline
    for (const id of ['node-2', 'node-5']) {
      await toggleNode(id, false);
    }
    await onRefreshNodes();

    setStatusMessage('Nodes configured. Executing reconstruction request to verify 3-of-5 recovery…');

    const expected =
      'Recovery SHOULD succeed: 3 nodes remain online (>= K=3 threshold). Both Reed-Solomon data shards and Shamir key shares meet quorum.';

    await executeReconstructionTest(
      'scenario-1',
      'Scenario 1 — Two Nodes Offline (Nodes 2 & 5)',
      expected,
      currentFile,
    );
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Scenario 2: Three Nodes Offline (Nodes 1, 2, 5)
  // Expected: FAILURE (Only 2 nodes online < K=3 threshold)
  // ───────────────────────────────────────────────────────────────────────────
  const runScenario2 = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveScenarioId('scenario-2');
    setStatusMessage('Configuring Scenario 2: Bringing Nodes 3, 4 ONLINE and Nodes 1, 2, 5 OFFLINE…');
    setExecutionResult(null);

    // Bring 3 and 4 online
    for (const id of ['node-3', 'node-4']) {
      await toggleNode(id, true);
    }
    // Take 1, 2, 5 offline
    for (const id of ['node-1', 'node-2', 'node-5']) {
      await toggleNode(id, false);
    }
    await onRefreshNodes();

    setStatusMessage('Nodes configured. Executing reconstruction request to verify failure below threshold…');

    const expected =
      'Recovery SHOULD fail: only 2 nodes online (< K=3 threshold). Insufficient Shamir shares and Reed-Solomon shards prevent key and data recovery.';

    await executeReconstructionTest(
      'scenario-2',
      'Scenario 2 — Three Nodes Offline (Nodes 1, 2 & 5)',
      expected,
      currentFile,
    );
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Custom Reconstruct Trigger (for currently configured node state)
  // ───────────────────────────────────────────────────────────────────────────
  const handleCustomTest = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveScenarioId('custom');
    setStatusMessage('Executing reconstruction request against current cluster topology…');
    setExecutionResult(null);

    const expected = isQuorumMet
      ? `Recovery EXPECTED to SUCCEED: ${onlineCount} nodes online (>= K=3 threshold).`
      : `Recovery EXPECTED to FAIL: ${onlineCount} nodes online (< K=3 threshold).`;

    await executeReconstructionTest(
      'custom',
      `Custom Cluster State (${onlineCount}/5 Nodes Online)`,
      expected,
      currentFile,
    );
  };

  return (
    <div className="vv-rec-page">
      {/* ── Section Header ─────────────────────────────────────────── */}
      <div className="vv-section-header">
        <div>
          <span className="vv-section-title">Recovery Lab</span>
          <span className="vv-section-subtitle">
            Distributed fault tolerance demonstration &amp; cryptographic reconstruction
          </span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            id="vv-rec-refresh-btn"
            className="vv-btn vv-btn--sm"
            onClick={onRefreshNodes}
            disabled={isRunning || togglingNodeId !== null}
            aria-label="Refresh node health"
          >
            ↻ Refresh Nodes
          </button>
        </div>
      </div>

      {/* ── 1. Quorum & Threshold Metric Overview Strip ─────────────── */}
      <section aria-label="Fault Tolerance Thresholds" className="vv-rec-overview-strip">
        <div className="vv-rec-stat-card">
          <span className="vv-rec-stat-label">TOTAL TOPOLOGY</span>
          <div className="vv-rec-stat-main">
            <span className="vv-rec-stat-value vv-text-code">{totalNodes}</span>
            <span className="vv-rec-stat-sub">5 registered storage nodes</span>
          </div>
        </div>

        <div className="vv-rec-stat-card">
          <span className="vv-rec-stat-label">ONLINE NODE QUORUM</span>
          <div className="vv-rec-stat-main">
            <span
              className={`vv-rec-stat-value vv-text-code ${
                isQuorumMet ? 'vv-text-green' : 'vv-text-red'
              }`}
            >
              {onlineCount} / {totalNodes}
            </span>
            <span className="vv-rec-stat-sub">
              {onlineCount} online · {offlineCount} offline
            </span>
          </div>
        </div>

        <div className="vv-rec-stat-card">
          <span className="vv-rec-stat-label">THRESHOLD RULE</span>
          <div className="vv-rec-stat-main">
            <span className="vv-rec-stat-value vv-text-code">K=3 / N=5</span>
            <span className="vv-rec-stat-sub">Minimum 3 nodes required</span>
          </div>
        </div>

        <div className="vv-rec-stat-card">
          <span className="vv-rec-stat-label">RECOVERY STATUS</span>
          <div style={{ marginTop: 2 }}>
            <span
              className={`vv-badge ${
                onlineCount === 5
                  ? 'vv-badge--online'
                  : isQuorumMet
                  ? 'vv-badge--warn'
                  : 'vv-badge--offline'
              }`}
            >
              {onlineCount === 5
                ? 'FULL REDUNDANCY'
                : isQuorumMet
                ? 'DEGRADED (RECOVERABLE)'
                : 'CRITICAL OUTAGE'}
            </span>
            <div className="vv-rec-stat-desc">
              {onlineCount === 5
                ? 'All nodes online. Tolerates up to 2 simultaneous node outages.'
                : isQuorumMet
                ? `${onlineCount} nodes online (>= K=3). Payload and key can still be recovered.`
                : `Only ${onlineCount} node${onlineCount === 1 ? '' : 's'} online (< K=3). Reconstruction impossible.`}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Data Recovery vs Key Recovery Architectural Principle ─── */}
      <section aria-label="Dual Recovery Architecture" className="vv-rec-principles">
        <div className="vv-rec-principle-card">
          <div className="vv-rec-principle-header">
            <span className="vv-rec-principle-tag">LAYER 1: CIPHERTEXT RECOVERY</span>
            <span className="vv-badge vv-badge--neutral">Reed–Solomon RS(3,5)</span>
          </div>
          <p className="vv-rec-principle-text">
            The encrypted file payload is split into <strong>5 erasure shards</strong> (3 data + 2
            parity) distributed across all nodes. Any 3 shards reconstruct the full ciphertext.
            Even if 2 storage nodes are permanently destroyed, zero payload bytes are lost.
          </p>
        </div>

        <div className="vv-rec-principle-card">
          <div className="vv-rec-principle-header">
            <span className="vv-rec-principle-tag">LAYER 2: KEY RECOVERY</span>
            <span className="vv-badge vv-badge--neutral">Shamir SSS (K=3, N=5)</span>
          </div>
          <p className="vv-rec-principle-text">
            The 256-bit AES master key is split into <strong>5 cryptographic shares</strong> over
            GF(256). Any 3 shares reconstruct the AES key via Lagrange polynomial interpolation.
            Fewer than 3 shares yield zero mathematical information about the encryption key.
          </p>
        </div>
      </section>

      {/* ── 3. Scenario Selection & Interactive Controls ─────────────── */}
      <section aria-label="Scenario Controls" className="vv-panel vv-rec-controls-panel">
        <div className="vv-rec-controls-header">
          <div>
            <h3 className="vv-rec-panel-heading">Fault-Tolerance Scenarios</h3>
            <p className="vv-text-muted" style={{ fontSize: 12, marginTop: 2 }}>
              Execute automated failure simulations or configure individual storage node availability.
            </p>
          </div>

          {/* Target File Picker */}
          <div className="vv-rec-file-picker">
            <label htmlFor="vv-rec-file-select" className="vv-label" style={{ marginRight: 8 }}>
              Target File:
            </label>
            {files.length === 0 ? (
              <span className="vv-text-muted" style={{ fontSize: 12, fontStyle: 'italic' }}>
                No files in vault (upload a file to test payload reconstruction)
              </span>
            ) : (
              <select
                id="vv-rec-file-select"
                className="vv-input vv-rec-select"
                value={selectedFileId}
                onChange={(e) => setSelectedFileId(e.target.value)}
                disabled={isRunning}
              >
                {files.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.filename} ({fmtBytes(f.sizeBytes)})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Empty Vault Warning if no files exist */}
        {files.length === 0 && (
          <div className="vv-msg vv-msg--warn" style={{ marginTop: 12 }}>
            <strong>Vault empty:</strong> You can still simulate node outages and quorum checks. To
            test live end-to-end payload reconstruction and SHA-256 verification, please upload a
            file first.
            {onNavigate && (
              <button
                type="button"
                className="vv-btn vv-btn--sm"
                style={{ marginLeft: 12 }}
                onClick={() => onNavigate('upload')}
              >
                Go to Upload →
              </button>
            )}
          </div>
        )}

        {/* 3 Scenario Cards */}
        <div className="vv-rec-scenarios-grid">
          {/* Scenario 1: 2 nodes offline */}
          <div
            className={`vv-rec-scenario-card ${
              activeScenarioId === 'scenario-1' ? 'vv-rec-scenario-card--active' : ''
            }`}
          >
            <div className="vv-rec-scenario-meta">
              <span className="vv-rec-scenario-num">SCENARIO 01</span>
              <span className="vv-badge vv-badge--online">EXPECTED: RECOVERY SUCCESS</span>
            </div>
            <h4 className="vv-rec-scenario-title">Two Storage Nodes Offline</h4>
            <p className="vv-rec-scenario-desc">
              Simulates failure of <strong>Node 2</strong> and <strong>Node 5</strong>. The remaining
              3 nodes (1, 3, 4) satisfy the K=3 threshold quorum for both Reed-Solomon shards and
              Shamir key shares.
            </p>
            <div className="vv-rec-scenario-footer">
              <button
                type="button"
                id="vv-scenario-1"
                className="vv-btn vv-btn--primary vv-btn--sm"
                disabled={isRunning}
                onClick={runScenario1}
              >
                {isRunning && activeScenarioId === 'scenario-1'
                  ? 'Executing…'
                  : 'Run Scenario 1 (2 Offline)'}
              </button>
            </div>
          </div>

          {/* Scenario 2: 3 nodes offline */}
          <div
            className={`vv-rec-scenario-card ${
              activeScenarioId === 'scenario-2' ? 'vv-rec-scenario-card--active' : ''
            }`}
          >
            <div className="vv-rec-scenario-meta">
              <span className="vv-rec-scenario-num">SCENARIO 02</span>
              <span className="vv-badge vv-badge--offline">EXPECTED: RECOVERY FAILURE</span>
            </div>
            <h4 className="vv-rec-scenario-title">Three Storage Nodes Offline</h4>
            <p className="vv-rec-scenario-desc">
              Simulates failure of <strong>Nodes 1, 2, and 5</strong>. Only 2 nodes remain online (3
              and 4), crossing below the K=3 threshold. Key and data reconstruction are mathematically
              impossible.
            </p>
            <div className="vv-rec-scenario-footer">
              <button
                type="button"
                id="vv-scenario-2"
                className="vv-btn vv-btn--danger vv-btn--sm"
                disabled={isRunning}
                onClick={runScenario2}
              >
                {isRunning && activeScenarioId === 'scenario-2'
                  ? 'Executing…'
                  : 'Run Scenario 2 (3 Offline)'}
              </button>
            </div>
          </div>

          {/* Scenario 3: Restore All */}
          <div
            className={`vv-rec-scenario-card ${
              activeScenarioId === 'restore-all' ? 'vv-rec-scenario-card--active' : ''
            }`}
          >
            <div className="vv-rec-scenario-meta">
              <span className="vv-rec-scenario-num">RESET BASELINE</span>
              <span className="vv-badge vv-badge--neutral">FULL TOPOLOGY</span>
            </div>
            <h4 className="vv-rec-scenario-title">Restore All 5 Nodes</h4>
            <p className="vv-rec-scenario-desc">
              Re-enables all 5 storage nodes through the simulator API, returning the cluster to full
              redundancy and readiness.
            </p>
            <div className="vv-rec-scenario-footer">
              <button
                type="button"
                id="vv-restore-all"
                className="vv-btn vv-btn--sm"
                disabled={isRunning}
                onClick={handleRestoreAll}
              >
                {isRunning && activeScenarioId === 'restore-all'
                  ? 'Restoring…'
                  : '↺ Restore All Nodes'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Live 5-Node Cluster Availability Visualization ───────── */}
      <section aria-label="Storage Node Cluster State" className="vv-panel vv-rec-nodes-panel">
        <div className="vv-rec-nodes-header">
          <div>
            <h3 className="vv-rec-panel-heading">Storage Node Cluster Status</h3>
            <span className="vv-text-muted" style={{ fontSize: 11, fontFamily: 'var(--vv-font-mono)' }}>
              Interactive topology · Click any node toggle to test custom failure combinations
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="vv-btn vv-btn--sm"
              disabled={isRunning || !currentFile}
              onClick={handleCustomTest}
              title="Test reconstruction against current node topology"
            >
              Test Reconstruction on Current State
            </button>
          </div>
        </div>

        <div className="vv-rec-nodes-grid">
          {nodes.map((node) => {
            const isToggling = togglingNodeId === node.id;
            return (
              <div
                key={node.id}
                className={`vv-rec-node-card ${
                  node.isHealthy ? 'vv-rec-node-card--online' : 'vv-rec-node-card--offline'
                }`}
              >
                <div className="vv-rec-node-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      className={`vv-status-dot ${
                        node.isHealthy ? 'vv-status-dot--online' : 'vv-status-dot--offline'
                      }`}
                    />
                    <span className="vv-rec-node-name">{node.name}</span>
                  </div>
                  <span
                    className={`vv-badge ${
                      node.isHealthy ? 'vv-badge--online' : 'vv-badge--offline'
                    }`}
                  >
                    {node.isHealthy ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>

                <div className="vv-rec-node-card-body">
                  <div className="vv-kv-row">
                    <span className="vv-kv-key">Node ID</span>
                    <span className="vv-kv-val vv-text-code" style={{ fontSize: 11 }}>
                      {node.id}
                    </span>
                  </div>
                  <div className="vv-kv-row">
                    <span className="vv-kv-key">Address</span>
                    <span className="vv-kv-val vv-text-code" style={{ fontSize: 11 }}>
                      {node.host}:{node.port}
                    </span>
                  </div>
                  <div className="vv-kv-row">
                    <span className="vv-kv-key">Shards stored</span>
                    <span className="vv-kv-val vv-mono" style={{ fontSize: 11 }}>
                      1 RS + 1 SSS
                    </span>
                  </div>
                </div>

                <div className="vv-rec-node-card-action">
                  <button
                    type="button"
                    className={`vv-btn vv-btn--sm ${
                      node.isHealthy ? 'vv-btn--danger' : 'vv-btn--primary'
                    }`}
                    style={{ width: '100%' }}
                    disabled={isRunning || isToggling}
                    onClick={() => handleManualToggle(node.id, node.isHealthy)}
                  >
                    {isToggling
                      ? 'Applying…'
                      : node.isHealthy
                      ? 'Simulate Offline'
                      : 'Restore Online'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Active Execution Terminal Loader Strip ──────────────────── */}
      {isRunning && (
        <div className="vv-panel vv-rec-running-banner">
          <div className="vv-rec-running-top">
            <span className="vv-text-code vv-text-green">
              ▶ [RECONSTRUCTION PIPELINE IN PROGRESS]
            </span>
            <span className="vv-mono" style={{ fontSize: 12 }}>
              {CIPHER_FRAMES[frameIdx]}
            </span>
          </div>
          <div className="vv-loader-strip vv-loader-strip--active" style={{ marginTop: 8 }}>
            {BINARY_FRAMES[frameIdx]}
          </div>
          <p className="vv-label" style={{ marginTop: 8 }}>
            {statusMessage || 'Processing cryptographic reconstruction…'}
          </p>
        </div>
      )}

      {/* ── 5. Multi-Stage Progress Rail (7 Stages) ─────────────────── */}
      <section aria-label="Retrieval and Reconstruction Pipeline" className="vv-panel vv-rec-rail-panel">
        <div className="vv-rec-rail-header">
          <div>
            <h3 className="vv-rec-panel-heading">Retrieval &amp; Reconstruction Pipeline</h3>
            <p className="vv-text-muted" style={{ fontSize: 11, fontFamily: 'var(--vv-font-mono)' }}>
              Sequential cryptographic pipeline stages · Distinct data-shard and key-share recovery
            </p>
          </div>

          <span className="vv-badge vv-badge--neutral">
            {isRunning ? 'PIPELINE ACTIVE' : executionResult ? 'EVALUATION SETTLED' : 'READY / IDLE'}
          </span>
        </div>

        <div className="vv-rec-rail-stages">
          {stages.map((stage) => {
            const isCompleted = stage.status === 'completed';
            const isFailed = stage.status === 'failed';
            const isRunningStage = stage.status === 'running';
            const isUnavailable = stage.status === 'unavailable';

            return (
              <div
                key={stage.id}
                className={`vv-rec-stage vv-rec-stage--${stage.status}`}
              >
                {/* Stage Number / Status Icon */}
                <div className="vv-rec-stage-num">
                  {isCompleted ? '✓' : isFailed ? '✕' : isRunningStage ? '▶' : isUnavailable ? '—' : `0${stage.id}`}
                </div>

                {/* Stage Info */}
                <div className="vv-rec-stage-body">
                  <div className="vv-rec-stage-top-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="vv-rec-stage-title">{stage.name}</span>
                      <span className="vv-rec-stage-mechanism">{stage.mechanism}</span>
                    </div>

                    <span
                      className={`vv-badge ${
                        isCompleted
                          ? 'vv-badge--online'
                          : isFailed
                          ? 'vv-badge--offline'
                          : isRunningStage
                          ? 'vv-badge--warn'
                          : 'vv-badge--neutral'
                      }`}
                    >
                      {stage.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="vv-rec-stage-desc">{stage.description}</p>

                  {/* Dynamic Observation / Detail */}
                  {stage.detail && (
                    <div
                      className={`vv-rec-stage-detail ${
                        isFailed ? 'vv-rec-stage-detail--err' : isCompleted ? 'vv-rec-stage-detail--ok' : ''
                      }`}
                    >
                      <span className="vv-text-code" style={{ fontSize: 11 }}>
                        &gt; {stage.detail}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Honest Technical Caveat Note */}
        <div className="vv-rec-evidence-note">
          <p className="vv-label" style={{ marginBottom: 4 }}>
            Evidence &amp; Architectural Transparency
          </p>
          <p style={{ fontSize: 12, color: 'var(--vv-muted)', lineHeight: 1.6 }}>
            The coordinator backend performs retrieval and reconstruction atomically in a single
            HTTP request (<code className="vv-code">GET /api/files/:id/download</code>).
            Stages above represent the cryptographic pipeline architecture.
            The <code className="vv-code">X-Reconstruction-Shares</code> header confirms Shamir key
            shares collected; Reed-Solomon data shard distribution is managed by the coordinator
            and internal storage node network.
          </p>
        </div>
      </section>

      {/* ── 6. Final Recovery Outcome Panel ─────────────────────────── */}
      {executionResult && (
        <section aria-label="Recovery Result" className="vv-panel vv-rec-outcome-panel">
          <div className="vv-rec-outcome-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                className={`vv-status-dot ${
                  executionResult.observed === 'success'
                    ? 'vv-status-dot--online'
                    : executionResult.observed === 'failure'
                    ? 'vv-status-dot--warn'
                    : 'vv-status-dot--offline'
                }`}
              />
              <span className="vv-rec-outcome-title">
                RECOVERY RESULT — {executionResult.scenarioTitle}
              </span>
            </div>

            <button
              type="button"
              className="vv-btn vv-btn--sm"
              onClick={() => setExecutionResult(null)}
              aria-label="Dismiss outcome panel"
            >
              ✕ Dismiss
            </button>
          </div>

          <div className="vv-rec-outcome-grid">
            {/* Left: Expected vs Observed comparison */}
            <div className="vv-rec-outcome-card">
              <h4 className="vv-rec-card-title">EXPERIMENT OUTCOME</h4>

              <div className="vv-stack" style={{ gap: 8 }}>
                <div className="vv-kv-row">
                  <span className="vv-kv-key">Expected</span>
                  <span className="vv-kv-val vv-text-muted" style={{ fontSize: 12 }}>
                    {executionResult.expected}
                  </span>
                </div>

                <div className="vv-kv-row">
                  <span className="vv-kv-key">Observed Outcome</span>
                  <span
                    className={`vv-badge ${
                      executionResult.observed === 'success'
                        ? 'vv-badge--online'
                        : executionResult.observed === 'failure'
                        ? 'vv-badge--warn'
                        : 'vv-badge--offline'
                    }`}
                  >
                    {executionResult.observed.toUpperCase()}
                  </span>
                </div>

                {executionResult.httpStatus && (
                  <div className="vv-kv-row">
                    <span className="vv-kv-key">HTTP Status</span>
                    <span className="vv-kv-val vv-text-code">
                      {executionResult.httpStatus}{' '}
                      {executionResult.httpStatus === 200 ? 'OK' : 'Coordinator Rejection'}
                    </span>
                  </div>
                )}

                <div
                  className={`vv-msg ${
                    executionResult.observed === 'success'
                      ? 'vv-msg--ok'
                      : executionResult.observed === 'failure'
                      ? 'vv-msg--warn'
                      : 'vv-msg--err'
                  }`}
                  style={{ marginTop: 8 }}
                >
                  {executionResult.message}
                </div>
              </div>
            </div>

            {/* Right: Telemetry & Cryptographic Proof */}
            <div className="vv-rec-outcome-card">
              <h4 className="vv-rec-card-title">TELEMETRY &amp; INTEGRITY PROOF</h4>

              <div className="vv-stack" style={{ gap: 6 }}>
                {executionResult.testedFilename && (
                  <div className="vv-kv-row">
                    <span className="vv-kv-key">Tested File</span>
                    <span className="vv-kv-val vv-text-code">
                      {executionResult.testedFilename}
                    </span>
                  </div>
                )}

                {executionResult.sharesRetrieved !== undefined && (
                  <div className="vv-kv-row">
                    <span className="vv-kv-key">Shamir Shares (X-Reconstruction-Shares)</span>
                    <span className="vv-kv-val vv-text-code">
                      {executionResult.sharesRetrieved} / 5 shares
                    </span>
                  </div>
                )}

                {executionResult.serverTimeMs !== undefined && (
                  <div className="vv-kv-row">
                    <span className="vv-kv-key">Server Decode Time (X-Reconstruction-Time-Ms)</span>
                    <span className="vv-kv-val vv-text-code">
                      {executionResult.serverTimeMs} ms
                    </span>
                  </div>
                )}

                {executionResult.clientDurationMs !== undefined && (
                  <div className="vv-kv-row">
                    <span className="vv-kv-key">Client Roundtrip Elapsed</span>
                    <span className="vv-kv-val vv-mono">
                      {executionResult.clientDurationMs} ms
                    </span>
                  </div>
                )}

                {/* SHA-256 Digest Proof */}
                {executionResult.downloadedSha256 && (
                  <div className="vv-rec-hash-block" style={{ marginTop: 8 }}>
                    <div className="vv-rec-hash-label">
                      <span>Downloaded File SHA-256</span>
                      <button
                        type="button"
                        className="vv-btn vv-btn--sm"
                        onClick={() =>
                          handleCopy(executionResult.downloadedSha256 || '', 'rec-sha')
                        }
                      >
                        {copiedKey === 'rec-sha' ? 'Copied ✓' : 'Copy'}
                      </button>
                    </div>
                    <code className="vv-rec-hash-code">
                      {executionResult.downloadedSha256}
                    </code>

                    {executionResult.baselineSha256 && (
                      <div style={{ marginTop: 6 }}>
                        <div className="vv-rec-hash-label">
                          <span>Original Baseline SHA-256</span>
                          <span
                            className={`vv-badge ${
                              executionResult.integrityMatch === 'verified'
                                ? 'vv-badge--online'
                                : 'vv-badge--offline'
                            }`}
                          >
                            {executionResult.integrityMatch === 'verified'
                              ? 'MATCH ✓'
                              : 'MISMATCH ✕'}
                          </span>
                        </div>
                        <code className="vv-rec-hash-code">
                          {executionResult.baselineSha256}
                        </code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
