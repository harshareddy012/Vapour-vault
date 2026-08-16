import { Request, Response } from 'express';
import { uploadService } from '../services/upload/uploadService.js';
import { reconstructionService } from '../services/reconstruction/reconstructionService.js';
import { fileRepository } from '../repositories/fileRepository.js';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('FileController');

export class FileController {
  async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded in form payload.' });
        return;
      }

      const k = parseInt(req.body.kThreshold || '3', 10);
      const n = parseInt(req.body.nShares || '5', 10);

      const result = await uploadService.processUpload(
        req.file.originalname,
        req.file.mimetype,
        req.file.buffer,
        // kThreshold and nShares will be forwarded once the SSS ticket
        // restores those parameters to processUpload.
      );


      res.status(201).json(result);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Upload request failed');
      res.status(500).json({ error: error.message });
    }
  }

  listFiles(req: Request, res: Response): void {
    const files = fileRepository.getAllFiles();
    res.json({ files, total: files.length });
  }

  getFileMetadata(req: Request, res: Response): void {
    const { id } = req.params;
    const file = fileRepository.getFile(id);
    if (!file) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }
    const chunks = fileRepository.getChunks(id);
    const shares = fileRepository.getShares(id);
    res.json({ file, chunks, shares });
  }

  async downloadFile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const startTime = Date.now();
      const result = await reconstructionService.reconstructFile(id);
      const durationMs = Date.now() - startTime;

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('X-Reconstruction-Shares', result.sharesRetrieved.toString());
      res.setHeader('X-Reconstruction-Time-Ms', durationMs.toString());

      res.send(result.data);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Download/Reconstruction failed');
      res.status(500).json({ error: error.message });
    }
  }
}

export const fileController = new FileController();
