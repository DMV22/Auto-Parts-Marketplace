import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthPasswordService } from './auth-password.service';
import type {
  AuthPasswordResponse,
  CreateAuthPasswordInput,
} from './auth-password.types';
import { AuthPasswordBodyPipe } from './auth-password.validation';
import { SessionAuthGuard } from './guards/session-auth.guard';

@Controller('api/v1/me/password')
@UseGuards(SessionAuthGuard)
export class AuthPasswordController {
  constructor(private readonly passwords: AuthPasswordService) {}

  @Post()
  create(
    @Req() request: Request,
    @Body(AuthPasswordBodyPipe) input: CreateAuthPasswordInput,
  ): Promise<AuthPasswordResponse> {
    return this.passwords.create(request.headers, input.newPassword);
  }
}
