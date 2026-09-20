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

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ACTIVE', service: 'DFS_SSS Coordinator', timestamp: new Date().toISOString() });
});

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
