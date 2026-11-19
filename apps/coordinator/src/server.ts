import express from 'express';
import cors from 'cors';
import { authRoutes } from './routes/authRoutes.js';
import { fileRoutes } from './routes/fileRoutes.js';
import { nodeRoutes } from './routes/nodeRoutes.js';
import { simulatorRoutes } from './routes/simulatorRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthMonitor } from './services/health/healthMonitor.js';
import { createServiceLogger } from '@dfs-sss/logger';

const PORT = parseInt(process.env.PORT || '4000', 10);
const logger = createServiceLogger('Coordinator');

// Prevent unhandled promise rejections from crashing the process
process.on('unhandledRejection', (reason: unknown) => {
  logger.error({ reason: reason instanceof Error ? reason.message : String(reason) }, 'Unhandled promise rejection — process will continue');
});

process.on('uncaughtException', (error: Error) => {
  logger.fatal({ error: error.message, stack: error.stack }, 'Uncaught exception — process will continue');
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));

// Health Check (available at both root and /api for reverse proxy compatibility)
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ACTIVE', service: 'DFS_SSS Coordinator', timestamp: new Date().toISOString() });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Register Modular API Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/simulator', simulatorRoutes);

// Global Error Handler Middleware
app.use(errorHandler);

// Start background Health Monitor polling
healthMonitor.startPolling(10000);

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'DFS_SSS Coordinator operational');
});
