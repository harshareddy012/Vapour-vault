import { Request, Response } from 'express';
import { uploadService } from '../services/upload/uploadService.js';
import { reconstructionService } from '../services/reconstruction/reconstructionService.js';
import { fileRepository } from '../repositories/fileRepository.js';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('FileController');

export class FileController {
  async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const ownerId = req.user.userId;
      const file = req.file!;

      const result = await uploadService.processUpload(
<<<<<<< HEAD
        file.originalname,
        file.mimetype,
        file.buffer,
        ownerId
=======
        req.file.originalname,
        req.file.mimetype,
        req.file.buffer,
        // kThreshold and nShares will be forwarded once the SSS ticket
        // restores those parameters to processUpload.
>>>>>>> be934f08dd1a02cc75e815a189f58e8d87ee49af
      );


      res.status(201).json(result);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Upload request failed');
      res.status(500).json({ error: error.message });
    }
  }

  listFiles(req: Request, res: Response): void {
    const fileRecords = fileRepository.getAllFileRecords();
    res.json({ fileRecords, total: fileRecords.length });
  }

  getFileMetadata(req: Request, res: Response): void {
    const { id } = req.params;

    const fileRecord = fileRepository.getFileRecord(id);

    if (!fileRecord) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }

    res.json({ fileRecord });
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
