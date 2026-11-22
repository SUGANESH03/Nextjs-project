
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
require('dotenv').config();

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // API prefix
    app.setGlobalPrefix('api');

    // Frontend CORS configuration
    app.enableCors({
        origin: 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    });

    const port = Number(process.env.PORT) || 4000;

    await app.listen(port);

    console.log(`Backend running at http://localhost:${port}/api`);
}

bootstrap().catch((error) => {
    console.error('Backend startup failed:', error);
    process.exit(1);
});
