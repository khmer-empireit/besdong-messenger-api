import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve local uploads as static files at /uploads/*
  app.useStaticAssets(path.resolve('./uploads'), { prefix: '/uploads' });

  // `helmet()` can enable CSP/HSTS headers that force browsers to upgrade `http://` requests
  // to `https://` (breaking local Swagger assets when you run the server without TLS).
  // Keep the strict headers only in production.
  const isProd = process.env.NODE_ENV === 'production';
  app.use(
    helmet(
      isProd
        ? undefined
        : {
            contentSecurityPolicy: false,
            // Explicitly clear any cached HSTS entries in browsers (Safari can keep
            // localhost HSTS around from prior runs, which forces `http://` to `https://`).
            hsts: { maxAge: 0 },
          },
    ),
  );

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = process.env.PORT || 3000;

  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Besdong Messenger API')
      .setDescription('REST API for Besdong Messenger')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
    console.log(`Swagger docs at http://localhost:${port}/docs`);
  }
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}/api/v1`);
}

bootstrap();
