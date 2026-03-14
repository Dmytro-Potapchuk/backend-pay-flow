import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe, Logger } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const logger = new Logger('Bootstrap')

  // Включаем поддержку CORS:
  app.enableCors()

  // Устанавливаем глобальную валидацию:
  app.useGlobalPipes(new ValidationPipe())

  // Конфигурация Swagger:
  const swaggerConfig = new DocumentBuilder()
      .setTitle('PayFlow API')
      .setDescription('Backend PayFlow')
      .setVersion('1.0')
      .addBearerAuth()
      .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('api', app, document)

  // Установка порта приложения:


  const PORT = process.env.PORT || 3000

  app.enableCors({
    origin: "*",
  });


  // Запуск приложения:
  await app.listen(3000, "0.0.0.0");

  const serverUrl = `http://localhost:${PORT}`

  // Логирование успешного запуска приложения:
  logger.log(`🚀 Server running: ${serverUrl}`)
  logger.log(`📚 Swagger docs: ${serverUrl}/api`)
}

bootstrap()