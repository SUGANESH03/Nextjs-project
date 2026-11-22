
require('dotenv').config();
require('reflect-metadata');

const { NestFactory } = require('@nestjs/core');
const AppModule = require('./src/app.module');

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS
    app.enableCors({
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
    });

    // API prefix
    app.setGlobalPrefix('api');

    const port = process.env.PORT || 4000;

    await app.listen(port);

    console.log(`Backend running at http://localhost:${port}`);
    console.log(`API URL: http://localhost:${port}/api`);
}

bootstrap();
