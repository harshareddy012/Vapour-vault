import React, { useState } from 'react';

export interface AuthScreenProps {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  isRegistering: boolean;
  setIsRegistering: React.Dispatch<React.SetStateAction<boolean>>;
  authLoading: boolean;
  authError: string;
  setAuthError: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure decorative static strings for the cyber background
// (Non-sensitive, purely decorative cryptographic patterns and binary streams)
// ─────────────────────────────────────────────────────────────────────────────
const CIPHER_STREAMS: string[] = [
  '01010110 01100001 01110000 01101111 01110101 01110010 01010110 01100001 01110101 01101100 01110100',
  'AES-256-GCM: IV[96] TAG[128] AAD[0x7F4A] C_LEN[4096] NONCE[e3b0c442] CIPHERTEXT[8f9a2b1c4e7d]',
  'SHAMIR_SECRET_SHARING: POLYNOMIAL_DEGREE=2 COEFFICIENTS=[a0=S, a1=RND, a2=RND] SHARES_N=5 THRESHOLD_K=3',
  'REED_SOLOMON: RS_GF(2^8) DATA_SHARDS=3 PARITY_SHARDS=2 CAUCHY_MATRIX QUORUM_REDUNDANCY=M2',
  'NODE_ROUTING: N1:127.0.0.1:4001 N2:127.0.0.1:4002 N3:127.0.0.1:4003 N4:127.0.0.1:4004 N5:127.0.0.1:4005',
  'SHA256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (GENESIS_BLOCK_DIGEST)',
  '11001010 00110101 10110010 01001101 11110000 00001111 10101010 01010101 11001100 00110011 11100011',
  'KEY_DERIVATION: PBKDF2_HMAC_SHA256 ROUNDS=100000 SALT[32] KEY_OUTPUT[256_BITS] SUBKEYS[K_AUTH, K_CIPHER]',
  '01100011 01110010 01111001 01110000 01110100 01101111 01100111 01110010 01100001 01110000 01101000',
  '0x7F9A 0x2B4C 0x6E1D 0x880F 0xAA31 0x55BC 0x9923 0xDEAD 0xBEEF 0x0042 0xCAFE 0xBABE 0xC001 0xD00D',
];

// Isometric Cube SVG Mark
function IsometricCubeIcon({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer hexagon */}
      <path
        d="M22 4L38 13.2V30.8L22 40L6 30.8V13.2L22 4Z"
        stroke="var(--vv-green, #39e58b)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Inner Y axes creating 3D cube */}
      <path
        d="M22 22V40"
        stroke="var(--vv-green, #39e58b)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M22 22L38 13.2"
        stroke="var(--vv-green, #39e58b)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M22 22L6 13.2"
        stroke="var(--vv-green, #39e58b)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Inner diamond / shard accent */}
      <polygon
        points="22,14 30,18.6 22,23.2 14,18.6"
        fill="rgba(57, 229, 139, 0.2)"
        stroke="var(--vv-green, #39e58b)"
        strokeWidth="1"
      />
      <circle cx="22" cy="22" r="2.5" fill="var(--vv-green, #39e58b)" />
    </svg>
  );
}

// Background Binary & Ciphertext Matrix Streams
function CipherBackground() {
  return (
    <div className="vv-cipher-bg" aria-hidden="true">
      {/* Horizontal scanline trace */}
      <div className="vv-scanlines" />

      {/* Isometric wireframe accent overlay */}
      <div className="vv-wireframe-grid" />

      {/* Vertical cascading data columns */}
      <div className="vv-cipher-streams">
        {CIPHER_STREAMS.map((stream, idx) => (
          <div
            key={idx}
            className={`vv-cipher-col vv-cipher-col--${idx % 5}`}
            style={{
              left: `${idx * 10 + 2}%`,
              animationDelay: `${(idx * 1.7) % 7}s`,
              animationDuration: `${14 + (idx % 4) * 3}s`,
            }}
          >
            <span className="vv-cipher-col__text">{stream}</span>
            <span className="vv-cipher-col__text">{stream}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuthScreen({
  email,
  setEmail,
  password,
  setPassword,
  isRegistering,
  setIsRegistering,
  authLoading,
  authError,
  setAuthError,
  onSubmit,
}: AuthScreenProps) {
  const [showTechnicalSpecs, setShowTechnicalSpecs] = useState(false);

  return (
    <div className="vv-auth-wrapper">
      {/* Subtle, accessible background animation */}
      <CipherBackground />

      <main className="vv-auth-container" id="vv-auth-main">
        {/* ── Brand Panel (Left) ─────────────────────────────────────────── */}
        <section className="vv-auth-brand-panel" aria-label="Vapour Vault Architecture Overview">
          <div className="vv-brand-header">
            <div className="vv-brand-mark-wrapper">
              <IsometricCubeIcon size={46} className="vv-brand-cube" />
              <div className="vv-brand-status-tag">
                <span className="vv-status-dot vv-status-dot--online" />
                <span className="vv-mono">CLUSTER READY [K=3/N=5]</span>
              </div>
            </div>

            <h1 className="vv-brand-title">
              <span className="vv-brand-accent">Vapour</span> Vault
            </h1>

            <p className="vv-brand-punchline">
              Your data. Encrypted. Distributed. Verifiable.
            </p>

            <p className="vv-brand-tagline">
              Split the secret. Survive the outage. Verify every byte.
            </p>

            <p className="vv-brand-description">
              Distributed cryptographic storage workstation. Combines authenticated AES-256-GCM symmetric ciphers with Shamir’s Secret Sharing key splitting across independent storage nodes.
            </p>
          </div>

          {/* Cryptographic Pipeline Flow */}
          <div className="vv-pipeline-card">
            <div className="vv-pipeline-title">
              <span className="vv-mono">CRYPTOGRAPHIC PIPELINE</span>
              <span className="vv-badge vv-badge--ok">AES-256-GCM</span>
            </div>

            <ol className="vv-pipeline-list">
              <li className="vv-pipeline-step">
                <span className="vv-pipeline-arrow" aria-hidden="true">↓</span>
                <div className="vv-pipeline-step-body">
                  <span className="vv-pipeline-name">Encrypt</span>
                  <span className="vv-pipeline-detail">AES-256-GCM authenticated payload envelope</span>
                </div>
              </li>
              <li className="vv-pipeline-step">
                <span className="vv-pipeline-arrow" aria-hidden="true">↓</span>
                <div className="vv-pipeline-step-body">
                  <span className="vv-pipeline-name">Split</span>
                  <span className="vv-pipeline-detail">Shamir Secret Sharing (threshold K=3, N=5 shares)</span>
                </div>
              </li>
              <li className="vv-pipeline-step">
                <span className="vv-pipeline-arrow" aria-hidden="true">↓</span>
                <div className="vv-pipeline-step-body">
                  <span className="vv-pipeline-name">Distribute</span>
                  <span className="vv-pipeline-detail">5 isolated storage nodes via Coordinator proxy</span>
                </div>
              </li>
              <li className="vv-pipeline-step">
                <span className="vv-pipeline-arrow" aria-hidden="true">↓</span>
                <div className="vv-pipeline-step-body">
                  <span className="vv-pipeline-name">Survive Failures</span>
                  <span className="vv-pipeline-detail">Quorum intact even if 2 nodes are offline or corrupted</span>
                </div>
              </li>
              <li className="vv-pipeline-step">
                <span className="vv-pipeline-arrow" aria-hidden="true">↓</span>
                <div className="vv-pipeline-step-body">
                  <span className="vv-pipeline-name">Reconstruct</span>
                  <span className="vv-pipeline-detail">Lagrange polynomial interpolation for key recovery</span>
                </div>
              </li>
              <li className="vv-pipeline-step">
                <span className="vv-pipeline-arrow" aria-hidden="true">↓</span>
                <div className="vv-pipeline-step-body">
                  <span className="vv-pipeline-name">Verify Integrity</span>
                  <span className="vv-pipeline-detail">SHA-256 fingerprint comparison against source</span>
                </div>
              </li>
            </ol>
          </div>

          {/* Interactive Actions for Left Panel */}
          <div className="vv-brand-actions">
            <button
              type="button"
              className="vv-btn vv-btn--primary"
              onClick={() => {
                setIsRegistering(true);
                setAuthError('');
                const input = document.getElementById('vv-email');
                if (input) input.focus();
              }}
            >
              Get Started →
            </button>
            <button
              type="button"
              className="vv-btn"
              onClick={() => setShowTechnicalSpecs((v) => !v)}
              aria-expanded={showTechnicalSpecs}
            >
              {showTechnicalSpecs ? 'Hide System Specs' : 'System Specs'}
            </button>
          </div>

          {/* Collapsible Architecture Specs Details (No dead links) */}
          {showTechnicalSpecs && (
            <div className="vv-technical-specs-panel" role="region" aria-label="System Specifications">
              <div className="vv-specs-row">
                <span className="vv-specs-k">ENCRYPTION CIPHER</span>
                <span className="vv-specs-v">AES-256-GCM (96-bit IV, 128-bit Tag)</span>
              </div>
              <div className="vv-specs-row">
                <span className="vv-specs-k">KEY SPLITTING</span>
                <span className="vv-specs-v">Shamir (k=3, n=5) over GF(256)</span>
              </div>
              <div className="vv-specs-row">
                <span className="vv-specs-k">DIGEST ALGORITHM</span>
                <span className="vv-specs-v">SHA-256 Cryptographic Hash</span>
              </div>
              <div className="vv-specs-row">
                <span className="vv-specs-k">NODE RECOVERY TOLERANCE</span>
                <span className="vv-specs-v">2 Faulty Nodes (N - K = 2)</span>
              </div>
            </div>
          )}
        </section>

        {/* ── Authentication Card (Right) ─────────────────────────────────── */}
        <section className="vv-auth-card-panel" aria-label="Account Access Form">
          <div className="vv-auth-card">
            <div className="vv-auth-card-header">
              <div className="vv-auth-card-brand">
                <IsometricCubeIcon size={22} />
                <span className="vv-auth-card-brand-text">Vapour Vault</span>
              </div>
              <div className="vv-auth-card-security-badge">
                <span className="vv-status-dot vv-status-dot--online" />
                <span className="vv-mono">TLS SECURED</span>
              </div>
            </div>

            <div className="vv-auth-card-titles">
              <h2 className="vv-auth-card-title">
                {isRegistering ? 'Initialize Account' : 'Welcome Back'}
              </h2>
              <p className="vv-auth-card-subtitle">
                {isRegistering
                  ? 'Register identity with coordinator cluster'
                  : 'Access your secure distributed storage'}
              </p>
            </div>

            <form onSubmit={onSubmit} className="vv-auth-form" noValidate>
              <div className="vv-form-group">
                <label className="vv-label" htmlFor="vv-email">
                  Identity / Email
                </label>
                <div className="vv-input-wrapper">
                  <span className="vv-input-affix" aria-hidden="true">
                    usr://
                  </span>
                  <input
                    id="vv-email"
                    className="vv-input vv-auth-input"
                    type="email"
                    autoComplete="username"
                    required
                    placeholder="operator@vapourvault.internal"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    disabled={authLoading}
                  />
                </div>
              </div>

              <div className="vv-form-group">
                <label className="vv-label" htmlFor="vv-password">
                  Security Passphrase
                </label>
                <div className="vv-input-wrapper">
                  <span className="vv-input-affix" aria-hidden="true">
                    key://
                  </span>
                  <input
                    id="vv-password"
                    className="vv-input vv-auth-input"
                    type="password"
                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    disabled={authLoading}
                  />
                </div>
              </div>

              {authError && (
                <div className="vv-auth-error-box" role="alert">
                  <span className="vv-auth-error-badge">ERR</span>
                  <span className="vv-auth-error-msg">{authError}</span>
                </div>
              )}

              {authLoading && (
                <div className="vv-auth-loading-state" aria-live="polite">
                  <div className="vv-loader-strip vv-loader-strip--active">
                    01001101 10110010 00110101 11001010
                  </div>
                  <span className="vv-label">
                    {isRegistering ? 'Registering identity…' : 'Authenticating coordinator session…'}
                  </span>
                </div>
              )}

              <button
                id="vv-auth-submit"
                type="submit"
                className="vv-btn vv-btn--primary vv-auth-submit"
                disabled={authLoading}
              >
                {authLoading
                  ? 'Processing Request…'
                  : isRegistering
                  ? 'Create Account'
                  : 'Sign In'}
              </button>

              <div className="vv-auth-switch-divider">
                <span>or</span>
              </div>

              <button
                id="vv-auth-switch"
                type="button"
                className="vv-btn vv-auth-switch-btn"
                disabled={authLoading}
                onClick={() => {
                  setIsRegistering((v) => !v);
                  setAuthError('');
                }}
              >
                {isRegistering ? 'Sign in with existing account' : 'Create New Account'}
              </button>
            </form>

            <div className="vv-auth-card-footer">
              <div className="vv-auth-footer-node-status">
                <span className="vv-mono vv-dim" style={{ fontSize: '11px' }}>
                  STORAGE ARCHITECTURE: 5 NODES · SSS K=3 / N=5 · AES-256-GCM
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
