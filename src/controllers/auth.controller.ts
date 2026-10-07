import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as bcrypt from 'bcrypt';
import { prisma } from '@/resources/database/main';
import { ApiResponseDto } from '@/resources/dto/response.dto';
import { AuthGuard } from '@/resources/guards/auth.guard';
import type {
  LoginDto,
  RefreshDto,
  RegisterDto,
} from '@/resources/dto/auth.dto';
import { issueTokens } from '@/resources/plugins/token-issuer.plugin';
import { getSessionContext } from '@/resources/plugins/location.plugin';
import jwtPlugin from '@/resources/plugins/jwt.plugin';

const BCRYPT_ROUNDS = 10;

@Controller('auth')
export class AuthController {
  @Post('register')
  async register(
    @Body() _body: RegisterDto,
    @Req() _request: FastifyRequest,
    @Res() _response: FastifyReply,
  ) {
    if (!_body.username?.trim()) {
      throw new HttpException(
        '아이디를 입력해주세요.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!_body.name?.trim()) {
      throw new HttpException('이름을 입력해주세요.', HttpStatus.BAD_REQUEST);
    }
    if (!_body.email?.trim()) {
      throw new HttpException(
        '이메일을 입력해주세요.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!_body.password || _body.password.length < 8) {
      throw new HttpException(
        '비밀번호는 8자 이상이어야 합니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const _existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: _body.username }, { email: _body.email }],
      },
    });
    if (_existing) {
      throw new HttpException(
        '이미 사용 중인 아이디 또는 이메일입니다.',
        HttpStatus.CONFLICT,
      );
    }

    const _hashed = await bcrypt.hash(_body.password, BCRYPT_ROUNDS);
    const _created = await prisma.user.create({
      data: {
        username: _body.username.trim(),
        name: _body.name.trim(),
        email: _body.email.trim(),
        password: _hashed,
        phone: _body.phone?.trim() || null,
      },
    });

    const { password: _pw, ..._safe } = _created as any;
    return _response
      .status(HttpStatus.CREATED)
      .send(ApiResponseDto.success(_safe));
  }

  @Post('login')
  async login(
    @Body() _body: LoginDto,
    @Req() _request: FastifyRequest,
    @Res() _response: FastifyReply,
  ) {
    const _identifier = _body.identifier || _body.email;
    if (!_identifier || !_body.password) {
      throw new HttpException(
        '아이디 또는 비밀번호가 올바르지 않습니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const _user = await prisma.user.findFirst({
      where: {
        OR: [{ username: _identifier }, { email: _identifier }],
        is_active: true,
      },
    });
    if (!_user) {
      throw new HttpException(
        '아이디 또는 비밀번호가 올바르지 않습니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const _matched = await bcrypt.compare(
      _body.password,
      (_user as any).password,
    );
    if (!_matched) {
      throw new HttpException(
        '아이디 또는 비밀번호가 올바르지 않습니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const _tokens = await issueTokens({
      user_uuid: _user.uuid,
      email: _user.email,
      session: getSessionContext(_request),
    });

    return _response
      .status(HttpStatus.OK)
      .send(ApiResponseDto.success(_tokens));
  }

  @Post('refresh')
  async refresh(
    @Body() _body: RefreshDto,
    @Req() _request: FastifyRequest,
    @Res() _response: FastifyReply,
  ) {
    if (!_body.refresh_token) {
      throw new HttpException(
        '유효하지 않거나 만료된 토큰입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const _payload = jwtPlugin.verify(_body.refresh_token);
    if (!_payload || _payload.type !== 'refresh') {
      throw new HttpException(
        '유효하지 않거나 만료된 토큰입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const _session = await prisma.refreshToken.findUnique({
      where: { uuid: _payload.sid },
    });
    if (!_session || _session.expires_at < new Date()) {
      throw new HttpException(
        '유효하지 않거나 만료된 토큰입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const _user = await prisma.user.findUnique({
      where: { uuid: _payload.uuid, is_active: true },
    });
    if (!_user) {
      throw new HttpException(
        '유효하지 않거나 만료된 토큰입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 기존 세션 폐기 후 재발급 (rotation)
    await prisma.refreshToken.delete({ where: { uuid: _session.uuid } });
    const _tokens = await issueTokens({
      user_uuid: _user.uuid,
      email: _user.email,
      session: getSessionContext(_request),
    });

    return _response
      .status(HttpStatus.OK)
      .send(ApiResponseDto.success(_tokens));
  }

  @Get('@me')
  @UseGuards(AuthGuard)
  async me(
    @Req() _request: FastifyRequest,
    @Res() _response: FastifyReply,
  ) {
    const _user = _request.user!;
    const { password: _pw, ..._safe } = _user as any;
    return _response.status(HttpStatus.OK).send(ApiResponseDto.success(_safe));
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(
    @Req() _request: FastifyRequest,
    @Res() _response: FastifyReply,
  ) {
    const _sessionId = (_request as any).session_id;
    if (_sessionId) {
      await prisma.refreshToken
        .delete({ where: { uuid: _sessionId } })
        .catch(() => null);
    }
    return _response.status(HttpStatus.OK).send(ApiResponseDto.success(null));
  }
}
