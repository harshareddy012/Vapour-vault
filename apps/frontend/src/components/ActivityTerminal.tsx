import React, { useState, useEffect, useRef } from 'react';
import { activityLogger, ActivityLogEntry } from '../utils/activityLogger';

function fmtTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    const time = d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${time}.${ms}`;
  } catch {
    return isoString;
  }
}

export function ActivityTerminal() {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('vv_terminal_expanded') === 'true';
    } catch {
      return false;
    }
  });

  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [followAutoScroll, setFollowAutoScroll] = useState(true);
  const terminalScrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to central activity logger
  useEffect(() => {
    const unsubscribe = activityLogger.subscribe((allEntries) => {
      setEntries(allEntries);
    });
    return unsubscribe;
  }, []);

  // Persist expanded state across sections
  const handleToggleExpand = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem('vv_terminal_expanded', String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // Auto-scroll to bottom if following
  useEffect(() => {
    if (isExpanded && followAutoScroll && terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [entries, isExpanded, followAutoScroll]);

  // Handle user scrolling manually
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 20;
    if (isAtBottom !== followAutoScroll) {
      setFollowAutoScroll(isAtBottom);
    }
  };

  const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;

  return (
    <aside
      className={`vv-global-terminal ${isExpanded ? 'vv-global-terminal--expanded' : 'vv-global-terminal--collapsed'}`}
      aria-label="Global Activity Terminal"
    >
      {/* ── Compact Header / Status Bar ──────────────────────────── */}
      <div className="vv-global-terminal__bar" onClick={handleToggleExpand}>
        <div className="vv-global-terminal__bar-left">
          <span className="vv-global-terminal__prompt" aria-hidden="true">
            ▶_
          </span>
          <span className="vv-global-terminal__title">ACTIVITY TERMINAL</span>
          <span className="vv-global-terminal__count">
            {entries.length} event{entries.length === 1 ? '' : 's'}
          </span>
          {lastEntry && (
            <span className="vv-global-terminal__last" title={lastEntry.summary}>
              <span className="vv-text-muted">Last:</span>{' '}
              <span className="vv-text-code">{lastEntry.method} {lastEntry.endpoint}</span>{' '}
              {lastEntry.durationMs !== undefined && (
                <span className="vv-text-amber">+{lastEntry.durationMs}ms</span>
              )}
            </span>
          )}
        </div>

        <div
          className="vv-global-terminal__bar-right"
          onClick={(e) => e.stopPropagation() /* prevent toggle when clicking actions */}
        >
          {isExpanded && (
            <>
              <button
                type="button"
                className={`vv-global-terminal__btn ${followAutoScroll ? 'vv-global-terminal__btn--active' : ''}`}
                onClick={() => setFollowAutoScroll((f) => !f)}
                title="Automatically scroll to bottom on new events"
              >
                Follow: {followAutoScroll ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                className="vv-global-terminal__btn"
                onClick={() => activityLogger.clearHistory()}
                title="Clear all recorded entries"
              >
                Clear
              </button>
            </>
          )}

          <button
            type="button"
            className="vv-global-terminal__toggle-btn"
            onClick={handleToggleExpand}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse activity terminal' : 'Expand activity terminal'}
          >
            {isExpanded ? '▼ Minimize' : '▲ Open Terminal'}
          </button>
        </div>
      </div>

      {/* ── Expanded Terminal Console ────────────────────────────── */}
      {isExpanded && (
        <div className="vv-global-terminal__drawer">
          <div className="vv-global-terminal__meta-header">
            <span className="vv-text-muted" style={{ fontSize: 10 }}>
              CAPTURING CLIENT-OBSERVED HTTP API REQUESTS &amp; RESPONSES · INTERNAL STORAGE-NODE TRANSFERS NOT STREAMED BY COORDINATOR
            </span>
          </div>

          <div
            ref={terminalScrollRef}
            className="vv-global-terminal__feed"
            onScroll={handleScroll}
            role="log"
            aria-live="polite"
          >
            {entries.length === 0 ? (
              <div className="vv-global-terminal__empty">
                <span className="vv-text-code">[READY — MONITORING CLIENT API ACTIVITY]</span>
                <p className="vv-text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                  API calls made during navigation, upload, download, or simulator testing will appear here in real time.
                </p>
              </div>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="vv-global-terminal__row">
                  <span className="vv-global-terminal__time">{fmtTimestamp(entry.timestamp)}</span>

                  <span className="vv-global-terminal__type">{entry.type}</span>

                  <span className="vv-global-terminal__method">{entry.method}</span>

                  <span
                    className={`vv-global-terminal__status ${
                      entry.status === 'ok'
                        ? 'vv-global-terminal__status--ok'
                        : entry.status === 'pending'
                        ? 'vv-global-terminal__status--pending'
                        : 'vv-global-terminal__status--err'
                    }`}
                  >
                    {entry.statusCode ? `${entry.statusCode}` : entry.status.toUpperCase()}
                  </span>

                  <span className="vv-global-terminal__endpoint">{entry.endpoint}</span>

                  {entry.durationMs !== undefined && (
                    <span className="vv-global-terminal__duration">+{entry.durationMs}ms</span>
                  )}

                  <span className="vv-global-terminal__summary">{entry.summary}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
