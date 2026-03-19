import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe, Logger } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const logger = new Logger('Bootstrap')

  app.enableCors({
    origin: "*",
  });

  app.useGlobalPipes(new ValidationPipe())

  const swaggerConfig = new DocumentBuilder()
      .setTitle('PayFlow API')
      .setDescription('Backend PayFlow')
      .setVersion('1.0')
      .addBearerAuth()
      .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('api', app, document)

  const PORT = process.env.PORT || 3000

  await app.listen(PORT, "0.0.0.0")

  const serverUrl = `http://localhost:${PORT}`

  logger.log(`🚀 Server running: ${serverUrl}`)
  logger.log(`📚 Swagger docs: ${serverUrl}/api`)
}

bootstrap()