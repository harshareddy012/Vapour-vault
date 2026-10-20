import { pgTable, varchar, timestamp, integer, bigint } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const storageNodes = pgTable('storage_nodes', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  host: varchar('host', { length: 255 }).notNull(),
  port: integer('port').notNull(),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
  capacityBytes: bigint('capacity_bytes', { mode: 'number' }).default(10737418240),
  usedBytes: bigint('used_bytes', { mode: 'number' }).default(0),
  lastPing: timestamp('last_ping', { withTimezone: true }).defaultNow(),
});

export const files = pgTable('files', {
  id: varchar('id', { length: 255 }).primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  cipherSizeBytes: bigint('cipher_size_bytes', { mode: 'number' }).notNull(),
  encryptionAlgo: varchar('encryption_algo', { length: 50 }).default('AES-256-GCM').notNull(),
  authTag: varchar('auth_tag', { length: 255 }).notNull(),
  iv: varchar('iv', { length: 255 }).notNull(),
  kThreshold: integer('k_threshold').default(3).notNull(),
  nShares: integer('n_shares').default(5).notNull(),
  checksumSha256: varchar('checksum_sha256', { length: 64 }).notNull(),
  ownerId: varchar('owner_id', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).default('UPLOADED').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const encryptedChunks = pgTable('encrypted_chunks', {
  id: varchar('id', { length: 255 }).primaryKey(),
  fileId: varchar('file_id', { length: 255 }).references(() => files.id, { onDelete: 'cascade' }).notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  storageNodeId: varchar('storage_node_id', { length: 255 }).references(() => storageNodes.id).notNull(),
  storageKey: varchar('storage_key', { length: 255 }).notNull(),
  checksumSha256: varchar('checksum_sha256', { length: 64 }).notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const secretShares = pgTable('secret_shares', {
  id: varchar('id', { length: 255 }).primaryKey(),
  fileId: varchar('file_id', { length: 255 }).references(() => files.id, { onDelete: 'cascade' }).notNull(),
  shareIndex: integer('share_index').notNull(),
  storageNodeId: varchar('storage_node_id', { length: 255 }).references(() => storageNodes.id).notNull(),
  checksumSha256: varchar('checksum_sha256', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
