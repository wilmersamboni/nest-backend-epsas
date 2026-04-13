import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as fs from 'fs';
import * as path from 'path';

// Asegurar que los directorios de uploads existan al iniciar
['uploads/bitacoras', 'uploads/actas'].forEach((dir) => {
  const full = path.join(process.cwd(), dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api2')

app.use(cookieParser());
  app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
  }),
);
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
