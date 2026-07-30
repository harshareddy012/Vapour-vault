import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export interface AppConfig {
  DATABASE_URL: string;
  MINIO_ENDPOINT: string;
  MINIO_PORT: number;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  JWT_SECRET: string;
  COORDINATOR_PORT: number;
  STORAGE_NODE_BASE_PORT: number;
  DEFAULT_K: number;
  DEFAULT_N: number;
  NODE_ENV: 'development' | 'production' | 'test';
}

export function loadConfig(): AppConfig {
  return {
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dfs_sss',
    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || 'localhost',
    MINIO_PORT: parseInt(process.env.MINIO_PORT || '9000', 10),
    MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || 'minioadmin',
    JWT_SECRET: process.env.JWT_SECRET || 'dfs_sss_super_secret_jwt_key_2026',
    COORDINATOR_PORT: parseInt(process.env.COORDINATOR_PORT || '4000', 10),
    STORAGE_NODE_BASE_PORT: parseInt(process.env.STORAGE_NODE_BASE_PORT || '5001', 10),
    DEFAULT_K: parseInt(process.env.DEFAULT_K || '3', 10),
    DEFAULT_N: parseInt(process.env.DEFAULT_N || '5', 10),
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  };
}

export const config = loadConfig();
