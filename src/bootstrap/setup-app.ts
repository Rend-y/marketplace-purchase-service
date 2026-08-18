import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import { AllExceptionsFilter } from '../shared/presentation';
import { HttpMetricsInterceptor } from '../shared/infrastructure/metrics';

/**
 * Cross-cutting HTTP concerns applied to every route in one place, so no controller has to
 * repeat them and integration tests exercise exactly the production pipeline.
 */
export const setupApp = (app: INestApplication): void => {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      stopAtFirstError: false,
    }),
  );

  app.useGlobalInterceptors(app.get(HttpMetricsInterceptor));
  app.useGlobalFilters(new AllExceptionsFilter(app.get(ClsService)));

  app.enableShutdownHooks();
};
