import React, { useState, useEffect } from 'react';
import {
  Shield,
  Upload,
  Download,
  Server,
  Activity,
  Lock,
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Zap,
  RefreshCw,
  Sliders,
} from 'lucide-react';

interface StorageNode {
  id: string;
  name: string;
  host: string;
  port: number;
  status: string;
  isHealthy: boolean;
}

interface FileItem {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kThreshold: number;
  nShares: number;
  createdAt: string;
}

export default function App() {
  const [kThreshold, setKThreshold] = useState<number>(3);
  const [nShares, setNShares] = useState<number>(5);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [nodes, setNodes] = useState<StorageNode[]>([]);
  const [nodeStates, setNodeStates] = useState<Record<string, boolean>>({
    'node-1': true,
    'node-2': true,
    'node-3': true,
    'node-4': true,
    'node-5': true,
  });
  const [scenarioResult, setScenarioResult] = useState<{
    title: string;
    success: boolean;
    message: string;
  } | null>(null);

  // Fetch Nodes & Files on Mount
  useEffect(() => {
    fetchNodes();
    fetchFiles();
    const interval = setInterval(fetchNodes, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchNodes = async () => {
    try {
      const res = await fetch('/api/nodes');
      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes || []);
        const states: Record<string, boolean> = {};
        (data.nodes || []).forEach((n: StorageNode) => {
          states[n.id] = n.isHealthy;
        });
        setNodeStates(states);
      }
    } catch {
      // Mock nodes fallback for standalone mode
      const mockNodes: StorageNode[] = [1, 2, 3, 4, 5].map((i) => ({
        id: `node-${i}`,
        name: `Storage Node ${i}`,
        host: 'http://localhost',
        port: 5000 + i,
        status: nodeStates[`node-${i}`] !== false ? 'ACTIVE' : 'INACTIVE',
        isHealthy: nodeStates[`node-${i}`] !== false,
      }));
      setNodes(mockNodes);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch {
      // Ignore
    }
  };

  const handleToggleNode = async (nodeId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setNodeStates((prev) => ({ ...prev, [nodeId]: newStatus }));
    try {
      await fetch(`/api/simulator/toggle/${nodeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: newStatus }),
      });
      fetchNodes();
    } catch {
      // Toggle locally in state
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress('Encrypting file with AES-256-GCM & splitting key with SSS...');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('kThreshold', kThreshold.toString());
    formData.append('nShares', nShares.toString());

    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setUploadProgress('Upload & secret share distribution successful!');
        setSelectedFile(null);
        fetchFiles();
      } else {
        const errData = await res.json();
        setUploadProgress(`Upload Failed: ${errData.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setUploadProgress(`Upload Failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadFile = async (fileId: string, filename: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}/download`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const errData = await res.json();
        alert(`Download Failed: ${errData.error}`);
      }
    } catch (err: any) {
      alert(`Download Failed: ${err.message}`);
    }
  };

  // Run Measurable Scenario 1
  const runScenario1 = async () => {
    setKThreshold(3);
    setNShares(5);
    // Disable Node 2 & Node 5
    await fetch('/api/simulator/toggle/node-2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOnline: false }),
    });
    await fetch('/api/simulator/toggle/node-5', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOnline: false }),
    });
    // Set Node 1, 3, 4 Online
    ['node-1', 'node-3', 'node-4'].forEach(async (id) => {
      await fetch(`/api/simulator/toggle/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: true }),
      });
    });

    await fetchNodes();

    if (files.length === 0) {
      setScenarioResult({
        title: 'Scenario 1: K=3, N=5 (2 Nodes Offline)',
        success: true,
        message: 'Nodes configured! Upload a file to test reconstruction with 3/5 active shares.',
      });
      return;
    }

    try {
      const res = await fetch(`/api/files/${files[0].id}/download`);
      if (res.ok) {
        setScenarioResult({
          title: 'Scenario 1: K=3, N=5 (Node 2 & Node 5 Offline)',
          success: true,
          message: 'RECOVERY SUCCESSFUL! 3 active shares were retrieved (>= K threshold = 3). File reconstructed cleanly.',
        });
      } else {
        const err = await res.json();
        setScenarioResult({ title: 'Scenario 1 Test', success: false, message: err.error });
      }
    } catch (err: any) {
      setScenarioResult({ title: 'Scenario 1 Test', success: false, message: err.message });
    }
  };

  // Run Measurable Scenario 2
  const runScenario2 = async () => {
    setKThreshold(3);
    setNShares(5);
    // Disable Node 1, Node 2, & Node 5 (3 nodes down, only 2 online)
    ['node-1', 'node-2', 'node-5'].forEach(async (id) => {
      await fetch(`/api/simulator/toggle/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: false }),
      });
    });
    ['node-3', 'node-4'].forEach(async (id) => {
      await fetch(`/api/simulator/toggle/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: true }),
      });
    });

    await fetchNodes();

    if (files.length === 0) {
      setScenarioResult({
        title: 'Scenario 2: K=3, N=5 (3 Nodes Offline)',
        success: false,
        message: 'Nodes configured! Upload a file to verify that reconstruction fails with only 2 available shares.',
      });
      return;
    }

    try {
      const res = await fetch(`/api/files/${files[0].id}/download`);
      if (res.ok) {
        setScenarioResult({ title: 'Scenario 2 Test', success: true, message: 'Unexpected success.' });
      } else {
        const err = await res.json();
        setScenarioResult({
          title: 'Scenario 2: K=3, N=5 (Node 1, Node 2 & Node 5 Offline)',
          success: false,
          message: `RECOVERY FAILED AS EXPECTED! "${err.error}" (Only 2/3 shares available).`,
        });
      }
    } catch (err: any) {
      setScenarioResult({ title: 'Scenario 2 Test', success: false, message: err.message });
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Header Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              padding: '12px',
              borderRadius: '16px',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Shield size={32} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }} className="gradient-text">
              DFS_SSS
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Distributed File System with Shamir's Secret Sharing & AES-256-GCM
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="glass-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={16} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.85rem' }}>
              Cluster Status:{' '}
              <strong style={{ color: 'var(--accent-emerald)' }}>
                {nodes.filter((n) => n.isHealthy).length} / {nodes.length} Healthy
              </strong>
            </span>
          </div>
          <button className="btn-primary" style={{ padding: '8px 12px' }} onClick={fetchNodes}>
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Upload & SSS Configuration Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Upload color="var(--accent-indigo)" size={20} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Secure Upload & Key Splitting</h2>
          </div>

          <form onSubmit={handleFileUpload}>
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Threshold (K): Reconstruct Requirement</label>
                  <span className="mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    K = {kThreshold}
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max={nShares}
                  value={kThreshold}
                  onChange={(e) => setKThreshold(parseInt(e.target.value))}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Shares (N): Distributed Nodes</label>
                  <span className="mono" style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>
                    N = {nShares}
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="5"
                  value={nShares}
                  onChange={(e) => {
                    const newN = parseInt(e.target.value);
                    setNShares(newN);
                    if (kThreshold > newN) setKThreshold(newN);
                  }}
                />
              </div>
            </div>

            <div
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                marginBottom: '20px',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <input
                type="file"
                id="file-input"
                style={{ display: 'none' }}
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
                <Lock size={32} color="var(--accent-purple)" style={{ marginBottom: '8px' }} />
                <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                  {selectedFile ? selectedFile.name : 'Click or Drag File to Encrypt & Upload'}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  AES-256-GCM Payload Encryption + {kThreshold}-of-{nShares} SSS Key Splitting
                </p>
              </label>
            </div>

            {uploadProgress && (
              <p style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '16px' }} className="mono">
                {uploadProgress}
              </p>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!selectedFile || isUploading}>
              <Zap size={18} /> {isUploading ? 'Encrypting & Distributing...' : 'Encrypt & Distribute File'}
            </button>
          </form>
        </div>

        {/* Node Failure Simulator & Demo Scenarios */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <AlertTriangle color="var(--accent-amber)" size={20} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Node Failure Simulator & Scenarios</h2>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Toggle individual storage nodes ON/OFF to test cluster resilience and fault tolerance:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {[1, 2, 3, 4, 5].map((i) => {
              const nodeId = `node-${i}`;
              const isOnline = nodeStates[nodeId] !== false;
              return (
                <div
                  key={nodeId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`pulse-dot ${isOnline ? 'online' : 'offline'}`} />
                    Storage Node {i} (Port {5000 + i})
                  </span>
                  <button
                    className={isOnline ? 'btn-danger' : 'btn-success'}
                    onClick={() => handleToggleNode(nodeId, isOnline)}
                  >
                    {isOnline ? 'Simulate Offline' : 'Set Online'}
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '10px' }}>Run Automated Demo Scenarios:</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '8px 12px' }} onClick={runScenario1}>
                Run Scenario 1 (K=3, 2 Nodes Off)
              </button>
              <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '8px 12px', background: 'linear-gradient(135deg, #f43f5e, #be123c)' }} onClick={runScenario2}>
                Run Scenario 2 (K=3, 3 Nodes Off)
              </button>
            </div>
          </div>

          {scenarioResult && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: '8px',
                background: scenarioResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                border: `1px solid ${scenarioResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
              }}
            >
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: scenarioResult.success ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                {scenarioResult.title}
              </p>
              <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>{scenarioResult.message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Cluster Storage Node Matrix */}
      <div className="glass-card" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>Distributed Storage Cluster Nodes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
          {nodes.map((node) => (
            <div
              key={node.id}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${node.isHealthy ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{node.name}</span>
                <span className={`badge ${node.isHealthy ? 'badge-online' : 'badge-offline'}`}>
                  {node.isHealthy ? 'ACTIVE' : 'OFFLINE'}
                </span>
              </div>
              <p className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {node.host}:{node.port}
              </p>
              <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Storage Key: </span>
                <code className="mono" style={{ color: 'var(--accent-cyan)' }}>share_x.sss</code>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Uploaded File Vault & Reconstruction */}
      <div className="glass-card">
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>Encrypted File Vault & SSS Reconstruction</h2>
        {files.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
            No files stored in cluster yet. Upload a file above to begin!
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>File Name</th>
                  <th style={{ padding: '12px' }}>Size</th>
                  <th style={{ padding: '12px' }}>Scheme</th>
                  <th style={{ padding: '12px' }}>Uploaded At</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Reconstruction</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} color="var(--accent-indigo)" />
                      <span style={{ fontWeight: 500 }}>{file.filename}</span>
                    </td>
                    <td style={{ padding: '12px' }} className="mono">
                      {(file.sizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className="mono" style={{ color: 'var(--accent-purple)', fontSize: '0.8rem' }}>
                        AES-256 + SSS ({file.kThreshold}/{file.nShares})
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(file.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => handleDownloadFile(file.id, file.filename)}
                      >
                        <Download size={14} /> Reconstruct & Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
