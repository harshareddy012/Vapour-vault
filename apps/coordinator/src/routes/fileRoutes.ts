import { Router } from 'express';
import multer from 'multer';
import { fileController } from '../controllers/fileController.js';

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB max limit

export const fileRoutes = Router();

fileRoutes.post('/upload', upload.single('file'), (req, res) => fileController.uploadFile(req, res));
fileRoutes.get('/', (req, res) => fileController.listFiles(req, res));
fileRoutes.get('/:id', (req, res) => fileController.getFileMetadata(req, res));
fileRoutes.get('/:id/download', (req, res) => fileController.downloadFile(req, res));
