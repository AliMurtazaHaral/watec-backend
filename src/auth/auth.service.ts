import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
// import * as argon from 'argonjs';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginAuthDto } from './dto/loginAuth.dto';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private  emailService: EmailService,
  ) {}

  async signup(dto: AuthDto) {
    // generate the password hash
    const hash = await argon.hash(dto.password);
    // save the new user in the db
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash,
        },
      });

      return this.signToken(user.id, user.email);
    } catch (error) {
      if (
        error instanceof
        PrismaClientKnownRequestError
      ) {
        if (error.code === 'P2002') {
          throw new ForbiddenException(
            'Credentials taken',
          );
        }
      }
      throw error;
    }
  }

  async signin(dto: LoginAuthDto) {
    // find the user by email
    const user =
      await this.prisma.user.findUnique({
        where: {
          email: dto.email,
        },
      });
    // if user does not exist throw exception
    if (!user)
      throw new ForbiddenException(
        'Credentials incorrect',
      );

    // compare password
    const pwMatches = await argon.verify(
      user.hash,
      dto.password,
    );
    // if password incorrect throw exception
    if (!pwMatches)
      throw new ForbiddenException(
        'Credentials incorrect',
      );
    return this.signToken(user.id, user.email);
  }

  async signToken(
    userId: number,
    email: string,
  ): Promise<{ access_token: string }> {
    const payload = {
      sub: userId,
      email,
    };
    const secret = this.config.get('JWT_SECRET');

    const token = await this.jwt.signAsync(
      payload,
      {
        expiresIn: '60m',
        secret: secret,
      },
    );

    return {
      access_token: token,
      email: email,
      userId: userId
    } as { access_token: string, email: string, userId: number };
  }

  async resetPassword(email: string, newPassword: string) {
    // Find the user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // If user does not exist throw exception
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Generate new password hash
    const newHash = await argon.hash(newPassword);

    // Update user's password in the db
    const updatedUser = await this.prisma.user.update({
      where: { email },
      data: { hash: newHash },
    });

    return updatedUser;
  }

  async updateUser(userId: number, newEmail: string, newPassword: string) {
    // Find the user by id
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // If user does not exist throw exception
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Generate new password hash
    const newHash = await argon.hash(newPassword);

    // Update user's email and password in the db
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: newEmail,
        hash: newHash,
      },
    });

    return updatedUser;
  }

  async sendPasswordResetEmail(userEmail: string, resetLink: string) {
    await this.emailService.sendMail(
      userEmail,
      'Passwort zurücksetzen',
      'Bitte klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen.',
      `<p>Bitte klicken Sie <a href="${resetLink}">hier</a>, um Ihr Passwort zurückzusetzen.</p>`
    );
  }
}
