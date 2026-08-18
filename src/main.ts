import 'reflect-metadata';

import type { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { setupApp, setupSwagger } from './bootstrap';
import { appConfig } from './config';

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(PinoLogger));
  app.flushLogs();

  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  setupApp(app);
  setupSwagger(app, config);

  await app.listen(config.port, config.host);

  app
    .get(PinoLogger)
    .log({ message: 'Application started', port: config.port, environment: config.nodeEnv });
};

bootstrap().catch((error: unknown) => {
  console.error('Failed to start the application', error);
  process.exitCode = 1;
});
