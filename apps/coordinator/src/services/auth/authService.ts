import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '@dfs-sss/config';
import { RegisterRequest, LoginRequest, AuthResponse, JwtPayload, User } from '@dfs-sss/shared-types';
import { UserRepository, userRepository as defaultUserRepository } from '../../repositories/userRepository.js';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('AuthService');
const BCRYPT_SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = '24h';

export class AuthService {
  constructor(private userRepo: UserRepository = defaultUserRepository) {}

  async register(req: RegisterRequest): Promise<AuthResponse> {
    const { email, password } = req;

    if (!email || !password) {
      const err: any = new Error('Email and password are required.');
      err.status = 400;
      throw err;
    }

    if (password.length < 6) {
      const err: any = new Error('Password must be at least 6 characters long.');
      err.status = 400;
      throw err;
    }

    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      const err: any = new Error(`User with email '${email}' already exists.`);
      err.status = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const userId = `user-${randomUUID()}`;
    const now = new Date().toISOString();

    const newUser: User = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      createdAt: now,
    };

    await this.userRepo.createUser(newUser);
    logger.info({ userId, email: newUser.email }, 'User registered successfully');

    const payload: JwtPayload = { userId: newUser.id, email: newUser.email };
    const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return {
      token,
      userId: newUser.id,
      email: newUser.email,
    };
  }

  async login(req: LoginRequest): Promise<AuthResponse> {
    const { email, password } = req;

    if (!email || !password) {
      const err: any = new Error('Email and password are required.');
      err.status = 400;
      throw err;
    }

    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      const err: any = new Error('Invalid email or password.');
      err.status = 401;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      logger.warn({ email }, 'Failed login attempt - incorrect password');
      const err: any = new Error('Invalid email or password.');
      err.status = 401;
      throw err;
    }

    logger.info({ userId: user.id, email: user.email }, 'User logged in successfully');

    const payload: JwtPayload = { userId: user.id, email: user.email };
    const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return {
      token,
      userId: user.id,
      email: user.email,
    };
  }
}

export const authService = new AuthService();
