import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as fs from 'fs';
import * as path from 'path';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

// Asegurar que los directorios de uploads existan al iniciar 
['uploads/bitacoras', 'uploads/actas', 'uploads/observaciones', 'uploads/documentos'].forEach((dir) => {
  const full = path.join(process.cwd(), dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api2', {
    exclude: [{ path: 'uploads/:folder/:filename', method: RequestMethod.GET }],
  })

app.use(cookieParser());
  app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
  }),
);

  const config = new DocumentBuilder()
    .setTitle('EPSAS API')
    .setDescription('Documentación de la API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Servidor corriendo en puerto ${process.env.PORT ?? 3001}`);
}
bootstrap();
