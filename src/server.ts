import { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
    FastifyAdapter,
    NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { ApplicationModule } from "./modules/app.module";
import { JwtGuard } from "./modules/auth/service/jwt.guard";
import { CommonModule, LogInterceptor } from "./modules/common";

/**
 * These are API defaults that can be changed using environment variables,
 * it is not required to change them (see the `.env.example` file)
 */
const API_DEFAULT_PORT = 3001;
const API_DEFAULT_PREFIX = "/api/v1/";

/**
 * The defaults below are dedicated to Swagger configuration, change them
 * following your needs (change at least the title & description).
 *
 * @todo Change the constants below following your API requirements
 */
const SWAGGER_TITLE = "svg-generator API";
const SWAGGER_DESCRIPTION = "API used for svg-generator management";
const SWAGGER_PREFIX = "/docs";

/**
 * Register a Swagger module in the NestJS application.
 * This method mutates the given `app` to register a new module dedicated to
 * Swagger API documentation. Any request performed on `SWAGGER_PREFIX` will
 * receive a documentation page as response.
 *
 * @todo See the `nestjs/swagger` NPM package documentation to customize the
 *       code below with API keys, security requirements, tags and more.
 */
function createSwagger(app: INestApplication) {
    const options = new DocumentBuilder()
        .setTitle(SWAGGER_TITLE)
        .setDescription(SWAGGER_DESCRIPTION)
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup(SWAGGER_PREFIX, app, document);
}

/**
 * Build & bootstrap the NestJS API.
 * This method is the starting point of the API; it registers the application
 * module and registers essential components such as the logger and request
 * parsing middleware.
 */
async function bootstrap(): Promise<void> {
    const app = await NestFactory.create<NestFastifyApplication>(
        ApplicationModule,
        new FastifyAdapter()
    );

    // @todo Enable Helmet for better API security headers

    app.setGlobalPrefix(process.env.API_PREFIX || API_DEFAULT_PREFIX);

    if (!process.env.SWAGGER_ENABLE || process.env.SWAGGER_ENABLE === "1") {
        createSwagger(app);
    }

    const logInterceptor = app.select(CommonModule).get(LogInterceptor);
    app.useGlobalInterceptors(logInterceptor);

    // 注册全局JWT认证守卫
    const jwtGuard = app.get(JwtGuard);
    app.useGlobalGuards(jwtGuard);

    // 尝试启动服务器，如果端口被占用则尝试下一个端口
    let port = parseInt(
        process.env.API_PORT || API_DEFAULT_PORT.toString(),
        10
    );
    const maxRetries = 10; // 最大尝试次数
    let retries = 0;
    while (retries < maxRetries) {
        try {
            await app.listen(port, "0.0.0.0");

            // 获取服务器URL
            const url = await app.getUrl();

            // 打印服务器信息
            console.log(`\n🚀 服务器已启动！`);
            console.log(
                `📡 本地访问: http://localhost:${port}${API_DEFAULT_PREFIX}`
            );
            console.log(`🌐 网络访问: ${url}${API_DEFAULT_PREFIX}`);

            if (
                !process.env.SWAGGER_ENABLE ||
                process.env.SWAGGER_ENABLE === "1"
            ) {
                console.log(
                    `📚 API文档: http://localhost:${port}${SWAGGER_PREFIX}`
                );
            }

            break; // 成功启动，跳出循环
        } catch (error: unknown) {
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "EADDRINUSE"
            ) {
                console.log(
                    `⚠️ 端口 ${port} 已被占用，尝试端口 ${port + 1}...`
                );
                port++;
                retries++;
            } else {
                throw error; // 如果是其他错误，则抛出
            }
        }
    }
    if (retries >= maxRetries) {
        throw new Error(
            `无法启动服务器：尝试了 ${maxRetries} 个端口，但都被占用`
        );
    }
}

/**
 * It is now time to turn the lights on!
 * Any major error that can not be handled by NestJS will be caught in the code
 * below. The default behavior is to display the error on stdout and quit.
 *
 * @todo It is often advised to enhance the code below with an exception-catching
 *       service for better error handling in production environments.
 */
bootstrap().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);

    const defaultExitCode = 1;
    process.exit(defaultExitCode);
});
