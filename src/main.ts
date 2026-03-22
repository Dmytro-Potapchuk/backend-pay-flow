import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe, Logger } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const logger = new Logger('Bootstrap')
  const frontendUrl = process.env.FRONTEND_PUBLIC_URL || 'https://dom.payflow.waw.pl'
  const swaggerUiPaths = ['api', 'docs']

  app.getHttpAdapter().getInstance().set('trust proxy', 1)

  app.enableCors({
    origin: [
      frontendUrl,
      'http://localhost:8081',
      'http://localhost:19006',
      'http://192.67.197.185:8081',
      'http://192.67.197.185:19006',
    ],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe())

  const swaggerConfig = new DocumentBuilder()
      .setTitle('PayFlow API')
      .setDescription('Backend PayFlow')
      .setVersion('1.0')
      .addBearerAuth()
      .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  swaggerUiPaths.forEach((path) => {
    SwaggerModule.setup(path, app, document)
  })

  const PORT = process.env.PORT || 3000

  await app.listen(PORT, "0.0.0.0")

  const serverUrl = `http://localhost:${PORT}`

  logger.log(`🚀 Server running: ${serverUrl}`)
  logger.log(`📚 Swagger docs: ${serverUrl}/api`)
  logger.log(`📚 Swagger docs (alias): ${serverUrl}/docs`)
}

bootstrap()