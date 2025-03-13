# NestJS 10 API 项目模板

使用此模板快速搭建您的下一个 [NestJS 10](https://nestjs.com/) API 项目

- 专为 Docker 环境打造（支持 Dockerfile 和环境变量）
- 支持 [Prisma](https://www.prisma.io/) 的 REST API
- Swagger 文档、[Joi](https://github.com/hapijs/joi) 验证、Winston 日志记录等
- 文件夹结构、代码示例和最佳实践
- 使用 [Fastify](https://fastify.dev/) 的快速 HTTP 服务器

## 1. 入门指南

### 1.1 要求

在开始之前，请确保您的工作站上至少安装了以下组件：

- 最新版本的 [NodeJS](https://nodejs.org/)，例如 20.x 和 NPM
- 数据库，例如 PostgreSQL。您可以使用提供的 `docker-compose.yml` 文件。

[Docker](https://www.docker.com/) 对于高级测试和镜像构建也可能有用，尽管它不是开发所必需的。

### 1.2 项目配置

首先在您的工作站上克隆此项目，或在 Github 上点击 ["使用此模板"](https://github.com/new?template_name=nestjs-template&template_owner=Saluki)。

```sh
git clone https://github.com/saluki/nestjs-template my-project
```

接下来是安装项目的所有依赖项。

```sh
cd ./my-project
npm install
```

安装完依赖项后，您现在可以通过创建一个新的 `.env` 文件来配置您的项目，该文件包含用于开发的环境变量。

```sh
cp .env.example .env
vi .env
```

对于标准的开发配置，您可以保留 `Api configuration` 部分下的 `API_PORT`、`API_PREFIX` 和 `API_CORS` 的默认值。`SWAGGER_ENABLE` 规则允许您控制 NestJS 的 Swagger 文档模块。在开始此示例时，请将其保留为 `1`。

接下来是 Prisma 配置：根据您自己的数据库设置更改 `DATABASE_URL`。

最后但同样重要的是，定义一个 `JWT_SECRET` 来签署 JWT 令牌，或在开发环境中保留默认值。将 `JWT_ISSUER` 更新为 JWT 中设置的正确值。

### 1.3 启动和探索

您现在可以使用以下命令启动 NestJS 应用程序。

```sh
# 仅在开发环境中使用，执行 Prisma 迁移
npx prisma migrate dev

# 使用 TSNode 启动开发服务器
npm run dev
```

您现在可以访问 `http://localhost:3000/docs` 查看您的 API Swagger 文档。示例乘客 API 位于 `http://localhost:3000/api/v1/passengers` 端点。

对于受限路由，您可以使用以下 JWT 进行测试

```
eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJERUZBVUxUX0lTU1VFUiIsImlhdCI6MTYzMTEwNDMzNCwicm9sZSI6InJlc3RyaWN0ZWQifQ.o2HcQBBpx-EJMcUFiqmAiD_jZ5J92gRDOyhybT9FakE
```

> 上面的示例 JWT 没有过期时间，请记住在生产环境中使用有效的 JWT 并强制执行所需的声明

## 2. 项目结构

此模板采用明确定义的目录结构。

```sh
src/
├── modules
│   ├── app.module.ts
│   ├── common/  # 公共模块包含在整个应用程序中使用的管道、守卫、服务和提供者
│   ├── passenger/  # 管理“乘客”资源的模块示例
│   │   ├── controller/
│   │   │   └── passenger.controller.ts
│   │   ├── flow/  # “flow”目录包含管道、拦截器以及可能更改请求或响应流的所有内容
│   │   │   └── passenger.pipe.ts
│   │   ├── model/
│   │   │   ├── passenger.data.ts  # 将在响应中返回的模型
│   │   │   └── passenger.input.ts  # 在请求中使用的模型
│   │   ├── passenger.module.ts
│   │   ├── service/
│   │   │   └── passenger.service.ts
│   │   └── spec/
│   └── tokens.ts
└── server.ts
```

## 3. 默认 NPM 命令

以下 NPM 命令已包含在此模板中，可用于快速运行、构建和测试您的项目。

```sh
# 使用转译后的 NodeJS 启动应用程序
npm run start

# 使用 "ts-node" 运行应用程序
npm run dev

# 转译 TypeScript 文件
npm run build

# 运行项目的功能测试
npm run test

# 使用 TSLint 对项目文件进行 lint 检查
npm run lint
```

## 5. 健康检查支持

健康检查 API 是一个 REST 端点，可用于验证服务及其依赖项的状态。健康检查 API 端点内部触发服务的整体健康检查。这可以包括数据库连接检查、系统属性、磁盘可用性和内存可用性。

可以使用 `HEALTH_TOKEN` 环境变量中的令牌请求示例健康检查端点。

```sh
curl -H 'Authorization: Bearer ThisMustBeChanged' http://localhost:3000/api/v1/health
```

## 6. 项目目标

该项目的目标是提供一个干净且最新的“入门包”，用于使用 NestJS 构建的 REST API 项目。

## 7. 贡献

欢迎提出改进建议、报告错误或提出问题：[https://github.com/saluki/nestjs-template/issues](https://github.com/saluki/nestjs-template/issues)