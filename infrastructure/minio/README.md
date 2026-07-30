# MinIO Integration & Setup

DFS_SSS uses **MinIO** as an Object Storage backend for encrypted file payload chunks.

## Running MinIO

MinIO is configured via Docker Compose:

```bash
docker-compose -f infrastructure/docker/docker-compose.yml up minio -d
```

- **S3 API Endpoint**: `http://localhost:9000`
- **Web Console**: `http://localhost:9001`
- **Root User**: `minioadmin`
- **Root Password**: `minioadmin`

## Standalone / Fallback Mode

If MinIO is not running locally, `@dfs-sss/storage-sdk` automatically uses the localized file system driver (`MinIOProvider`), creating directories at `./storage_node_data/node-X`.
