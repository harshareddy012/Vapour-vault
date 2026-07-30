export interface SecretShare {
  index: number; // x coordinate (1..N)
  share: string; // y coordinate (hex string)
  checksumSha256?: string;
}

export interface EncryptionResult {
  encryptedPayload: Buffer;
  iv: string; // hex
  authTag: string; // hex
  keyShares: SecretShare[];
  originalKeyHex?: string; // used internally before zeroing
}

export interface FileMetadata {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  encryptionAlgo: string;
  authTag: string;
  iv: string;
  kThreshold: number;
  nShares: number;
  createdAt: string;
  checksumSha256: string;
}

export interface EncryptedChunkMeta {
  id: string;
  fileId: string;
  chunkIndex: number;
  storageNodeId: string;
  storageKey: string;
  checksumSha256: string;
  sizeBytes: number;
}

export interface ShareMetadata {
  id: string;
  fileId: string;
  shareIndex: number;
  storageNodeId: string;
  checksumSha256: string;
}

export interface StorageNodeInfo {
  id: string;
  name: string;
  host: string;
  port: number;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  capacityBytes: number;
  usedBytes: number;
  lastPing: string;
  isHealthy: boolean;
}

export interface NodeHealthRecord {
  id: string;
  nodeId: string;
  latencyMs: number;
  isHealthy: boolean;
  checkedAt: string;
}

export interface UploadFileRequest {
  filename: string;
  mimeType: string;
  kThreshold: number;
  nShares: number;
}

export interface UploadFileResponse {
  fileId: string;
  filename: string;
  kThreshold: number;
  nShares: number;
  sharesDistributed: number;
  chunksDistributed: number;
  checksumSha256: string;
  message: string;
}

export interface ReconstructFileResponse {
  fileId: string;
  filename: string;
  mimeType: string;
  fileBufferBase64: string;
  sharesRetrieved: number;
  reconstructionTimeMs: number;
}

export interface FailureSimulatorState {
  nodeStates: Record<string, boolean>; // nodeId -> isOnline
}

export interface ScenarioTestResult {
  scenarioName: string;
  kThreshold: number;
  nShares: number;
  disabledNodes: string[];
  sharesObtained: number;
  expectedSuccess: boolean;
  actualSuccess: boolean;
  message: string;
}
