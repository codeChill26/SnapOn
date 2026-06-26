import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repository';
import { signToken } from '../lib/jwt';
import { UnauthorizedError, NotFoundError } from '../lib/errors';

export class AuthService {
  private userRepository = new UserRepository();

  async login(email: string, passwordInput: string) {
    const configEmail = process.env.ADMIN_EMAIL || 'admin@snapon.com';
    const configHash = process.env.ADMIN_PASSWORD_HASH;
    console.log("========== LOGIN DEBUG ==========");
    console.log("Input Email:", email);
    console.log("Input Password:", passwordInput);
    console.log("ENV Email:", configEmail);
    console.log("ENV Hash:", JSON.stringify(configHash));
    console.log("Hash Length:", configHash?.length);
    if (email !== configEmail) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!configHash) {
      throw new Error('ADMIN_PASSWORD_HASH environment variable is not configured');
    }

    const passwordMatch = await bcrypt.compare(passwordInput, configHash);
    if (!passwordMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if the user exists in database and has role ADMIN
    const dbUser = await this.userRepository.findByEmail(email);
    if (!dbUser) {
      throw new NotFoundError('Admin user account does not exist in the database');
    }

    if (dbUser.role !== 'ADMIN') {
      throw new UnauthorizedError('Access denied: Account is not an administrator');
    }

    const token = signToken({
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role || 'ADMIN',
      fullName: dbUser.fullName,
      avatarUrl: dbUser.avatarUrl,
    });

    return {
      token,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.fullName,
        role: dbUser.role,
        avatarUrl: dbUser.avatarUrl,
      },
    };
  }
}
