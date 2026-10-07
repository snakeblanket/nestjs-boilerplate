import { Controller, Get, HttpStatus, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ApiResponseDto } from '@/resources/dto/response.dto';
import jwtPlugin from '@/resources/plugins/jwt.plugin';
import utility from '@/resources/plugins/utility.plugin';

@Controller()
export class HealthController {
  @Get('health')
  async health(
    @Req() _request: FastifyRequest,
    @Res() _response: FastifyReply,
  ) {
    return _response.status(HttpStatus.OK).send(
      ApiResponseDto.success({
        status: 'ok',
        version: utility.getVersion(),
        uptime: process.uptime(),
      }),
    );
  }

  @Get('.well-known/jwks.json')
  async jwks(
    @Req() _request: FastifyRequest,
    @Res() _response: FastifyReply,
  ) {
    return _response
      .status(HttpStatus.OK)
      .send({ keys: [jwtPlugin.getPublicJwk()] });
  }
}
