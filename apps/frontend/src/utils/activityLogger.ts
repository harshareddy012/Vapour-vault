// ─────────────────────────────────────────────────────────────────────────────
// Frontend API Activity Logger
// Centralized, transparent capture of client-observed HTTP requests & responses.
// Strictly redaction-compliant: NO passwords, NO tokens, NO keys, NO raw data.
// ─────────────────────────────────────────────────────────────────────────────

export interface ActivityLogEntry {
  id: string;
  timestamp: string; // ISO string
  type: 'HTTP' | 'CLIENT';
  method: string;
  endpoint: string;
  status: 'pending' | 'ok' | 'err';
  statusCode?: number;
  statusText?: string;
  durationMs?: number;
  safeHeaders?: Record<string, string>;
  summary: string;
}

type ActivityListener = (entries: ActivityLogEntry[]) => void;

const SAFE_HEADER_ALLOWLIST = [
  'content-type',
  'content-length',
  'x-reconstruction-shares',
  'x-reconstruction-time-ms',
];

class ActivityLogger {
  private entries: ActivityLogEntry[] = [];
  private listeners: Set<ActivityListener> = new Set();
  private isInitialized = false;

  constructor() {
    this.loadFromSession();
  }

  private loadFromSession() {
    if (typeof window === 'undefined') return;
    try {
      const saved = sessionStorage.getItem('vv_global_activity_log');
      if (saved) {
        this.entries = JSON.parse(saved);
      }
    } catch {
      this.entries = [];
    }
  }

  private saveToSession() {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem('vv_global_activity_log', JSON.stringify(this.entries.slice(-100)));
    } catch {
      /* ignore storage quota restrictions */
    }
  }

  public getEntries(): ActivityLogEntry[] {
    return this.entries;
  }

  public subscribe(listener: ActivityListener): () => void {
    this.listeners.add(listener);
    listener(this.entries);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.saveToSession();
    this.listeners.forEach((l) => l([...this.entries]));
  }

  public clearHistory() {
    this.entries = [];
    try {
      sessionStorage.removeItem('vv_global_activity_log');
    } catch {
      /* ignore */
    }
    this.notify();
  }

  public logClientEvent(operation: string, summary: string, status: 'ok' | 'err' = 'ok') {
    const entry: ActivityLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      type: 'CLIENT',
      method: 'EVENT',
      endpoint: operation,
      status,
      summary,
    };
    this.entries.push(entry);
    if (this.entries.length > 200) {
      this.entries.shift();
    }
    this.notify();
  }

  /**
   * Transparent fetch interceptor that captures only client-initiated /api/* calls.
   * Runs non-destructively; never leaks passwords, JWTs, AES keys or binary payloads.
   */
  public initFetchInterceptor() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    const originalFetch = window.fetch;
    const logger = this;

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      // Only monitor API requests
      if (!urlStr.includes('/api/')) {
        return originalFetch.apply(this, [input, init]);
      }

      const method = (init?.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();
      const startTime = performance.now();
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const timestamp = new Date().toISOString();

      // Clean path representation (strip full origin if local)
      let endpoint = urlStr;
      try {
        const parsed = new URL(urlStr, window.location.origin);
        endpoint = parsed.pathname;
      } catch {
        /* use raw */
      }

      // Initial pending entry
      const entry: ActivityLogEntry = {
        id,
        timestamp,
        type: 'HTTP',
        method,
        endpoint,
        status: 'pending',
        summary: `Request sent -> ${method} ${endpoint}`,
      };

      logger.entries.push(entry);
      if (logger.entries.length > 200) {
        logger.entries.shift();
      }
      logger.notify();

      try {
        const response = await originalFetch.apply(this, [input, init]);
        const durationMs = Math.round(performance.now() - startTime);

        // Extract safe headers allowlist
        const safeHeaders: Record<string, string> = {};
        SAFE_HEADER_ALLOWLIST.forEach((h) => {
          const val = response.headers.get(h);
          if (val) safeHeaders[h] = val;
        });

        let summary = `HTTP ${response.status} ${response.statusText}`;

        // Generate safe, non-sensitive summary based on endpoint
        if (endpoint.includes('/api/auth/')) {
          summary = response.ok ? 'Authentication successful' : `Auth failed (HTTP ${response.status})`;
        } else if (endpoint === '/api/nodes') {
          // Clone safely to inspect summary without consuming stream
          try {
            const clone = response.clone();
            const data = await clone.json();
            if (data && typeof data === 'object') {
              summary = `Nodes: ${data.total ?? 0} registered (${data.healthyCount ?? 0} online, ${data.unhealthyCount ?? 0} offline)`;
            }
          } catch {
            summary = response.ok ? 'Cluster node inventory received' : `Node query failed (HTTP ${response.status})`;
          }
        } else if (endpoint.includes('/api/simulator/toggle')) {
          try {
            const clone = response.clone();
            const data = await clone.json();
            if (data && data.message) {
              summary = data.message;
            } else if (data && data.nodeId) {
              summary = `Node ${data.nodeId} set to ${data.isOnline ? 'ONLINE' : 'OFFLINE'}`;
            }
          } catch {
            summary = response.ok ? 'Node toggle confirmed' : `Toggle failed (HTTP ${response.status})`;
          }
        } else if (endpoint === '/api/files' && method === 'GET') {
          try {
            const clone = response.clone();
            const data = await clone.json();
            if (data && Array.isArray(data.fileRecords)) {
              summary = `Vault inventory: ${data.fileRecords.length} stored file record(s)`;
            }
          } catch {
            summary = response.ok ? 'Vault files list received' : `Files fetch failed (HTTP ${response.status})`;
          }
        } else if (endpoint.includes('/api/files/upload')) {
          try {
            const clone = response.clone();
            const data = await clone.json();
            if (data && data.fileId) {
              summary = `Uploaded & distributed: ID ${data.fileId.slice(0, 8)}… (K=${data.kThreshold ?? 3}/N=${data.nShares ?? 5})`;
            }
          } catch {
            summary = response.ok ? 'File uploaded and distributed' : `Upload failed (HTTP ${response.status})`;
          }
        } else if (endpoint.includes('/download')) {
          const shares = safeHeaders['x-reconstruction-shares'];
          const time = safeHeaders['x-reconstruction-time-ms'];
          const size = safeHeaders['content-length'];
          summary = `Reconstruction download: ${size ? size + ' B' : 'stream'}${shares ? ` (${shares} key shares, ${time ?? '?'}ms)` : ''}`;
        }

        // Update entry
        entry.status = response.ok ? 'ok' : 'err';
        entry.statusCode = response.status;
        entry.statusText = response.statusText;
        entry.durationMs = durationMs;
        entry.safeHeaders = safeHeaders;
        entry.summary = summary;

        logger.notify();
        return response;
      } catch (err: unknown) {
        const durationMs = Math.round(performance.now() - startTime);
        entry.status = 'err';
        entry.durationMs = durationMs;
        entry.summary = `Connection failed: ${err instanceof Error ? err.message : 'Network error'}`;
        logger.notify();
        throw err;
      }
    };
  }
}

export const activityLogger = new ActivityLogger();
