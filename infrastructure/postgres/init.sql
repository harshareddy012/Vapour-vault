-- PostgreSQL Schema Initialization for DFS_SSS

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS files (
    id VARCHAR(255) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    encryption_algo VARCHAR(50) DEFAULT 'AES-256-GCM',
    auth_tag VARCHAR(255) NOT NULL,
    iv VARCHAR(255) NOT NULL,
    k_threshold INT NOT NULL DEFAULT 3,
    n_shares INT NOT NULL DEFAULT 5,
    checksum_sha256 VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS storage_nodes (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    capacity_bytes BIGINT DEFAULT 10737418240,
    used_bytes BIGINT DEFAULT 0,
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS encrypted_chunks (
    id VARCHAR(255) PRIMARY KEY,
    file_id VARCHAR(255) REFERENCES files(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    storage_node_id VARCHAR(255) REFERENCES storage_nodes(id),
    storage_key VARCHAR(255) NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS secret_shares (
    id VARCHAR(255) PRIMARY KEY,
    file_id VARCHAR(255) REFERENCES files(id) ON DELETE CASCADE,
    share_index INT NOT NULL,
    storage_node_id VARCHAR(255) REFERENCES storage_nodes(id),
    checksum_sha256 VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS node_health (
    id SERIAL PRIMARY KEY,
    node_id VARCHAR(255) REFERENCES storage_nodes(id),
    latency_ms INT DEFAULT 0,
    is_healthy BOOLEAN DEFAULT TRUE,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    file_id VARCHAR(255),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial storage nodes
INSERT INTO storage_nodes (id, name, host, port, status) VALUES
('node-1', 'Storage Node 1', 'http://localhost', 5001, 'ACTIVE'),
('node-2', 'Storage Node 2', 'http://localhost', 5002, 'ACTIVE'),
('node-3', 'Storage Node 3', 'http://localhost', 5003, 'ACTIVE'),
('node-4', 'Storage Node 4', 'http://localhost', 5004, 'ACTIVE'),
('node-5', 'Storage Node 5', 'http://localhost', 5005, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;
