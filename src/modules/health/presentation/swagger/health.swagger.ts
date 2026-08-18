import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { LivenessResponseDto, ReadinessResponseDto } from '../dto';

export const ApiReadinessProbe = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiOperation({
      summary: 'Readiness probe',
      description:
        'Reports whether the instance can serve traffic: PostgreSQL and RabbitMQ must be reachable and the process must not be shutting down',
    }),
    ApiResponse({ status: HttpStatus.OK, description: 'Ready', type: ReadinessResponseDto }),
    ApiResponse({
      status: HttpStatus.SERVICE_UNAVAILABLE,
      description: 'Not ready',
      type: ReadinessResponseDto,
    }),
  );

export const ApiLivenessProbe = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiOperation({
      summary: 'Liveness probe',
      description:
        'Reports whether the process itself is healthy. Deliberately independent of external dependencies so an outage does not trigger restart loops',
    }),
    ApiResponse({ status: HttpStatus.OK, description: 'Alive', type: LivenessResponseDto }),
    ApiResponse({
      status: HttpStatus.SERVICE_UNAVAILABLE,
      description: 'Event loop is blocked beyond the configured threshold',
      type: LivenessResponseDto,
    }),
  );
