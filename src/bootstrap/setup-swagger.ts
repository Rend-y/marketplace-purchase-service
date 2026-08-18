import type { INestApplication } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import type { appConfig } from '../config';

export const setupSwagger = (app: INestApplication, config: ConfigType<typeof appConfig>): void => {
  if (!config.swaggerEnabled) {
    return;
  }

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Marketplace purchase service')
      .setDescription(
        'Idempotent, race-safe product purchases: one product can be bought by exactly one buyer',
      )
      .setVersion('1.0.0')
      .build(),
  );

  SwaggerModule.setup(config.swaggerPath, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
};
