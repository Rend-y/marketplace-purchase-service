import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import type { Request } from 'express';
import { ClsService } from 'nestjs-cls';
import { LoggerModule as PinoLoggerModule, type Params } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';

import { appConfig, loggerConfig } from '../../../config';
import { HTTP_HEADER } from '../../constants';

const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  `req.headers["${HTTP_HEADER.IDEMPOTENCY_KEY}"]`,
];

const buildParams = (
  logger: ConfigType<typeof loggerConfig>,
  app: ConfigType<typeof appConfig>,
  cls: ClsService,
): Params => ({
  pinoHttp: {
    level: logger.level,
    // Access logging is delegated to Prometheus metrics; only meaningful events are logged.
    autoLogging: false,
    quietReqLogger: true,
    base: { service: 'purchase-service', env: app.nodeEnv },
    redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
    formatters: {
      level: (label: string): Record<string, string> => ({ level: label }),
    },
    genReqId: (request): string => {
      if (cls.isActive()) {
        return cls.getId();
      }

      const header = (request as Request).headers[HTTP_HEADER.REQUEST_ID];
      return typeof header === 'string' && header.length > 0 ? header : uuidv4();
    },
    transport: logger.pretty
      ? {
          target: 'pino-pretty',
          options: { singleLine: true, colorize: true, translateTime: 'SYS:standard' },
        }
      : undefined,
  },
});

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [loggerConfig.KEY, appConfig.KEY, ClsService],
      useFactory: buildParams,
    }),
  ],
})
export class LoggerModule {}
