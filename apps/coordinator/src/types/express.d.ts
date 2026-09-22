import { JwtPayload } from '@dfs-sss/shared-types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
