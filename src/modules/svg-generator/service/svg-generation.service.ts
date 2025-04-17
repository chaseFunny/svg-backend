import { createOpenAI } from "@ai-sdk/openai";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { FilePart, ImagePart, streamText, TextPart } from "ai";
import type { FastifyReply } from "fastify";
import { PrismaService } from "../../common";
import {
    SvgGenerationData,
    SvgGenerationInput,
    SvgGenerationWithVersionData,
    SvgModifyRecord,
    SvgVersionData,
} from "../model";

// 自定义响应接口，用于处理 OpenAI 的流式响应
interface CustomStreamResponse {
    status: string;
    message?: string;
    id?: number;
    chunk?: string;
}

@Injectable()
export class SvgGenerationService {
    private readonly SVG_WIDTH = 800; // 固定 SVG 宽度为 800px
    private readonly logger = new Logger(SvgGenerationService.name);
    public constructor(private readonly prismaService: PrismaService) {}

    /**
     * Find all SVG generations in the database
     *
     * @returns A list of SVG generations
     */
    public async findAll(): Promise<SvgGenerationData[]> {
        const generations = await this.prismaService.svgGeneration.findMany({});
        return generations.map(
            (generation) => new SvgGenerationData(generation)
        );
    }

    /**
     * Find all SVG generations with pagination and include latest versions
     *
     * @param page Page number (1-based)
     * @param pageSize Number of items per page
     * @returns A paginated list of SVG generations with their latest versions
     */
    public async findAllPaginated(
        page: number,
        pageSize: number
    ): Promise<{ items: SvgGenerationWithVersionData[]; total: number }> {
        const skip = (page - 1) * pageSize;
        const take = pageSize;

        // 获取总数
        const total = await this.prismaService.svgGeneration.count();

        // 获取分页后的生成记录
        const generations = await this.prismaService.svgGeneration.findMany({
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: {
                svgVersions: {
                    orderBy: { versionNumber: "desc" },
                    take: 1,
                },
            },
        });

        // 转换为 DTO，包含最新版本
        const generationsWithVersions = generations.map((generation) => {
            const latestVersion = generation.svgVersions[0]
                ? new SvgVersionData(generation.svgVersions[0])
                : undefined;
            return new SvgGenerationWithVersionData(generation, latestVersion);
        });

        return { items: generationsWithVersions, total };
    }

    /**
     * Find SVG generations by user ID with pagination and include latest versions
     *
     * @param userId User ID
     * @param page Page number (1-based)
     * @param pageSize Number of items per page
     * @returns A paginated list of SVG generations with their latest versions for the user
     */
    public async findByUserIdPaginated(
        userId: number,
        page: number,
        pageSize: number
    ): Promise<{ items: SvgGenerationWithVersionData[]; total: number }> {
        const skip = (page - 1) * pageSize;
        const take = pageSize;

        // 获取用户生成记录总数
        const total = await this.prismaService.svgGeneration.count({
            where: { userId },
        });

        // 获取分页后的用户生成记录
        const generations = await this.prismaService.svgGeneration.findMany({
            where: { userId },
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: {
                svgVersions: {
                    orderBy: { versionNumber: "desc" },
                    take: 1,
                },
            },
        });

        // 转换为 DTO，包含最新版本
        const generationsWithVersions = generations.map((generation) => {
            const latestVersion = generation.svgVersions[0]
                ? new SvgVersionData(generation.svgVersions[0])
                : undefined;
            // 过滤掉没有内容的生成记录
            return new SvgGenerationWithVersionData(generation, latestVersion);
        });

        return { items: generationsWithVersions, total };
    }

    /**
     * Find SVG generations by user ID
     *
     * @param userId User ID
     * @returns A list of SVG generations for the user
     */
    public async findByUserId(userId: number): Promise<SvgGenerationData[]> {
        const generations = await this.prismaService.svgGeneration.findMany({
            where: { userId },
        });
        return generations.map(
            (generation) => new SvgGenerationData(generation)
        );
    }

    /**
     * Find a specific SVG generation by ID
     *
     * @param id Generation ID
     * @returns The SVG generation if found
     */
    public async findById(id: number): Promise<SvgGenerationData | null> {
        const generation = await this.prismaService.svgGeneration.findUnique({
            where: { id },
        });
        return generation ? new SvgGenerationData(generation) : null;
    }

    /**
     * Find all versions of an SVG generation
     *
     * @param generationId Generation ID
     * @returns A list of SVG versions
     */
    public async findVersions(generationId: number): Promise<SvgVersionData[]> {
        const versions = await this.prismaService.svgVersion.findMany({
            where: { generationId },
            orderBy: { versionNumber: "asc" },
        });
        return versions.map((version) => new SvgVersionData(version));
    }

    /**
     * 创建 SVG 生成（普通方式）
     *
     * @param userId 用户 ID
     * @param data SVG 生成详情
     * @returns 创建的 SVG 生成
     */
    public async create(
        userId: number,
        data: SvgGenerationInput
    ): Promise<SvgGenerationData> {
        // 检查用户是否存在并且有足够的积分
        const user = await this.prismaService.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException(`用户 ID ${userId} 不存在`);
        }

        if (user.remainingCredits <= 0) {
            throw new Error("用户没有剩余积分");
        }

        // 解析宽高比并计算高度
        let height = this.SVG_WIDTH; // 默认为正方形
        if (data.aspectRatio) {
            height = this.calculateHeightFromAspectRatio(data.aspectRatio);
        }

        // 在一个事务中创建生成记录和初始版本
        const result = await this.prismaService.$transaction(async (prisma) => {
            // 减少用户积分
            await prisma.user.update({
                where: { id: userId },
                data: { remainingCredits: { decrement: 1 } },
            });

            // 创建配置对象，包含宽高信息
            const configWithSize = this.prepareConfiguration(data, height);

            // 创建生成记录
            const generation = await prisma.svgGeneration.create({
                data: {
                    userId,
                    inputContent: data.inputContent,
                    style: data.style,
                    aspectRatio: data.aspectRatio,
                    configuration: configWithSize,
                    modelNames: ["claude-3-7-sonnet-all"], // 默认使用标准模型
                },
            });

            // 创建初始版本
            const svgPlaceholder =
                '<svg xmlns="http://www.w3.org/2000/svg" ' +
                `viewBox="0 0 ${this.SVG_WIDTH} ${height}" ` +
                `width="${this.SVG_WIDTH}" height="${height}">` +
                '<text x="10" y="50">正在生成 SVG...</text></svg>';

            await prisma.svgVersion.create({
                data: {
                    generationId: generation.id,
                    svgContent: svgPlaceholder,
                    versionNumber: 1,
                    isAiGenerated: true,
                },
            });

            return generation;
        });

        return new SvgGenerationData(result);
    }

    /**
     * 流式创建 SVG 生成
     *
     * @param userId 用户 ID
     * @param data SVG 生成详情
     * @param reply Fastify 响应对象，用于流式传输
     */
    public async createStream(
        userId: number,
        data: SvgGenerationInput,
        reply: FastifyReply
    ): Promise<void> {
        // 定义一个变量追踪响应是否已经结束
        let hasEnded = false;
        this.logger.log(`开始流式创建 SVG 生成，用户 ID: ${userId}`);
        try {
            // 检查用户是否存在并且有足够的积分
            const user = await this.prismaService.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                throw new NotFoundException(`用户 ID ${userId} 不存在`);
            }

            if (user.remainingCredits <= 0) {
                throw new Error("用户没有剩余积分");
            }

            // 解析宽高比并计算高度
            let height = this.SVG_WIDTH; // 默认为正方形
            if (data.aspectRatio) {
                height = this.calculateHeightFromAspectRatio(data.aspectRatio);
            }

            // 设置流式响应头
            reply.raw.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no", // 禁用Nginx缓冲
                "Transfer-Encoding": "chunked", // 使用分块传输编码
            });

            // 尝试禁用响应缓冲区
            if (reply.raw.socket) {
                // 设置TCP层不合并小包
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                reply.raw.socket.setNoDelay?.(true);
                // 尝试设置TCP保持活动状态
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                reply.raw.socket.setKeepAlive?.(true, 30000);
            }

            // 每30秒发送一个保持连接存活的心跳消息
            const keepAliveInterval = setInterval(() => {
                if (!hasEnded && !reply.raw.writableEnded) {
                    try {
                        // 发送注释消息作为心跳
                        reply.raw.write(": keepalive\n\n");
                    } catch (e) {
                        this.logger.error(`发送心跳消息失败：${e}`);
                    }
                } else {
                    clearInterval(keepAliveInterval);
                }
            }, 30000);

            // 确保在函数结束时清除心跳定时器
            const cleanup = () => {
                clearInterval(keepAliveInterval);
            };

            // 响应结束时清理资源
            reply.raw.on("close", () => {
                this.logger.log("客户端连接已关闭");
                cleanup();
                hasEnded = true;
            });

            reply.raw.on("error", (err) => {
                this.logger.error(
                    `响应出错：${
                        err instanceof Error ? err.message : String(err)
                    }`
                );
                cleanup();
                hasEnded = true;
            });

            // 创建配置对象，包含宽高信息
            const configWithSize = this.prepareConfiguration(data, height);
            // 创建生成记录
            const generation = await this.prismaService.svgGeneration.create({
                data: {
                    userId,
                    inputContent: data.inputContent,
                    style: data.style,
                    aspectRatio: data.aspectRatio,
                    configuration: configWithSize,
                    modelNames: [
                        data.isThinking === "thinking"
                            ? "claude-3-7-sonnet-thinking-all"
                            : "claude-3-7-sonnet-all",
                    ], // 根据 isThinking 选择模型
                },
            });

            // 发送初始状态更新
            try {
                const startEvent = `data: ${JSON.stringify({
                    status: "started",
                    message: "开始生成 SVG",
                    id: generation.id,
                } as CustomStreamResponse)}\n\n`;
                reply.raw.write(startEvent);

                // 强制刷新缓冲区
                const rawReplyStart = reply.raw as unknown as {
                    flushHeaders?: () => void;
                };
                if (rawReplyStart.flushHeaders) {
                    rawReplyStart.flushHeaders();
                }
            } catch (e) {
                console.error("发送初始状态更新时出错：", e);
                hasEnded = true;
                throw e; // 重新抛出错误，让外层 catch 捕获
            }

            try {
                const { fullPrompt, systemPrompt } = this.getPrompts(
                    data.type ?? "",
                    data,
                    this.SVG_WIDTH,
                    height
                );

                // 创建自定义的 OpenAI 客户端实例
                const customOpenAI = createOpenAI({
                    apiKey: process.env.ANTHROPIC_API_KEY, // 使用请求提供的 apiKey，如果没有则使用环境变量
                    baseURL: process.env.ANTHROPIC_API_URL, // 使用请求提供的 baseURL，如果没有则使用默认值
                });
                // 构建消息内容，包括文本和图片
                const messageContent: Array<TextPart | ImagePart | FilePart> = [
                    {
                        type: "text",
                        text: fullPrompt ?? "",
                    },
                ];
                if (configWithSize.config_image) {
                    messageContent.push({
                        type: "image",
                        image: data.image as unknown as string,
                        mimeType: (data.image as unknown as string)
                            .split(";")[0]
                            .split(":")[1],
                        providerOptions: {
                            anthropic: {
                                type: "base64",
                            },

                            // "media-type": (data.image as unknown as string)
                            //     .split(";")[0]
                            //     .split(":")[1],
                            // data: data.image as unknown as string,
                        },
                    });
                }
                if (configWithSize.fileContent) {
                    messageContent.push({
                        type: "file",
                        data: configWithSize.fileContent as unknown as string,
                        mimeType: (
                            configWithSize.fileContent as unknown as string
                        )
                            .split(";")[0]
                            .split(":")[1],
                        providerOptions: {
                            anthropic: {
                                type: "base64",
                            },
                        },
                    });
                }

                // 初始化变量以跟踪尝试的模型
                let lastError: unknown = null;
                let streamResult = null;
                let success = false;
                const currentModel =
                    data.isThinking === "thinking"
                        ? "claude-3-7-sonnet-thinking-all"
                        : "deepseek-chat";
                this.logger.log("messageContent:", messageContent);
                try {
                    // 使用当前模型调用 API
                    // 定义基本的流选项
                    const baseStreamOptions = {
                        model: customOpenAI(currentModel),
                        system: systemPrompt ?? "",
                        // maxTokens: 64000,
                        maxTokens: 4096,
                        abortSignal: AbortSignal.timeout(60000 * 20), // 设置 2 分钟超时
                        temperature: 0.1,
                        // 添加事件处理函数
                        onError: (error: unknown) => {
                            this.logger.error(
                                `AI 生成过程中出错，用户 ID: ${userId}，模型：${
                                    data.isThinking === "thinking"
                                        ? "claude-3-7-sonnet-thinking-all"
                                        : "deepseek-chat"
                                }，错误信息：${JSON.stringify(error)}`
                            );
                            // 保存错误以便稍后重试其他模型
                            lastError = error;
                        },
                    };

                    // 根据是否有图片或文件内容，选择不同的调用方式
                    if (
                        configWithSize.config_image ||
                        configWithSize.fileContent
                    ) {
                        // 使用 messages 格式以支持图片和文件
                        this.logger.log(
                            `使用带有多媒体内容的 messages 格式调用模型 ${currentModel}`
                        );
                        streamResult = streamText({
                            ...baseStreamOptions,
                            messages: [
                                {
                                    role: "user",
                                    content: messageContent,
                                },
                            ],
                        });
                    } else {
                        // 只有文本内容时使用 prompt 字段
                        this.logger.log(
                            `使用纯文本 prompt 字段调用模型 ${currentModel}`
                        );
                        streamResult = streamText({
                            ...baseStreamOptions,
                            prompt: fullPrompt ?? "",
                        });
                    }

                    // 如果没有抛出异常，则标记为成功并退出循环
                    success = true;
                    this.logger.log(`成功使用模型：${currentModel}`);
                } catch (error) {
                    // 记录当前模型的失败
                    this.logger.error(
                        `模型 ${currentModel} 调用失败：${
                            error instanceof Error ? error.message : "未知错误"
                        }`
                    );
                    lastError = error;
                }

                // 如果所有模型都失败，返回错误
                if (!success) {
                    if (!hasEnded) {
                        const errorMessage = this.parseAIError(lastError);
                        const errorEvent = `data: ${JSON.stringify({
                            status: "error",
                            message: `所有可用模型都无法生成SVG: ${errorMessage}`,
                            id: generation.id,
                        } as CustomStreamResponse)}\n\n`;

                        reply.raw.write(errorEvent);
                        reply.raw.end();
                        hasEnded = true;
                    }
                    return;
                }

                let processedSvgContent = ""; // 用于收集处理后的 SVG 内容
                this.logger.log("streamResult:", streamResult);
                // 处理流式响应
                if (streamResult && streamResult.textStream) {
                    this.logger.log("准备处理 textStream，开始迭代...");
                    let chunkCount = 0;
                    try {
                        for await (const textPart of streamResult.textStream) {
                            // 防止响应已结束情况下继续写入
                            if (hasEnded) {
                                this.logger.log("响应已结束，停止处理流");
                                break;
                            }

                            // 跳过空数据块
                            if (!textPart || textPart.trim() === "") {
                                this.logger.log("收到空数据块，跳过");
                                continue;
                            }

                            chunkCount++;
                            processedSvgContent += textPart;
                            this.logger.log(
                                `收到第 ${chunkCount} 个数据块，长度：${
                                    textPart.length
                                }字节，内容：${textPart.slice(0, 100)}`
                            );

                            // 发送每个数据块到前端
                            try {
                                const chunkEvent = `data: ${JSON.stringify({
                                    status: "streaming",
                                    id: generation.id,
                                    chunk: textPart,
                                } as CustomStreamResponse)}\n\n`;

                                const writeResult = reply.raw.write(chunkEvent);
                                this.logger.log(
                                    `数据块 ${chunkCount} 写入结果：${
                                        writeResult ? "成功" : "缓冲区已满"
                                    }`
                                );

                                // 如果缓冲区已满，等待 drain 事件
                                if (!writeResult && !hasEnded) {
                                    this.logger.log(
                                        "缓冲区已满，等待 drain 事件..."
                                    );
                                    await new Promise<void>((resolve) => {
                                        const onDrain = () => {
                                            reply.raw.removeListener(
                                                "drain",
                                                onDrain
                                            );
                                            resolve();
                                        };
                                        reply.raw.on("drain", onDrain);
                                    });
                                    this.logger.log("缓冲区已清空，继续写入");
                                }

                                // 强制刷新缓冲区，确保数据立即发送给客户端
                                if (reply.raw.flushHeaders) {
                                    reply.raw.flushHeaders();
                                }

                                // 额外尝试刷新
                                const rawReply = reply.raw as {
                                    flush?: () => void;
                                };
                                if (typeof rawReply.flush === "function") {
                                    rawReply.flush();
                                }
                            } catch (e) {
                                this.logger.error(
                                    `发送数据块时出错，用户 ID: ${userId}，数据块 ${chunkCount}，错误信息：${e}`
                                );
                                if (!hasEnded) {
                                    try {
                                        const errorEvent = `data: ${JSON.stringify(
                                            {
                                                status: "error",
                                                message: "数据传输过程中断",
                                                id: generation.id,
                                            } as CustomStreamResponse
                                        )}\n\n`;
                                        reply.raw.write(errorEvent);
                                        reply.raw.end();
                                        hasEnded = true;
                                    } catch (endError) {
                                        this.logger.error(
                                            `尝试结束响应时出错，用户 ID: ${userId}，错误信息：${endError}`
                                        );
                                    }
                                }
                                throw e; // 重新抛出错误，让外层 catch 捕获
                            }
                        }
                        this.logger.log(
                            `流处理完成，共处理了 ${chunkCount} 个数据块`
                        );
                    } catch (streamError) {
                        this.logger.error(
                            `处理流时发生错误：${
                                streamError instanceof Error
                                    ? streamError.message
                                    : "未知错误"
                            }`
                        );
                        if (!hasEnded) {
                            const errorEvent = `data: ${JSON.stringify({
                                status: "error",
                                message: `流处理错误: ${
                                    streamError instanceof Error
                                        ? streamError.message
                                        : "未知错误"
                                }`,
                                id: generation.id,
                            } as CustomStreamResponse)}\n\n`;
                            reply.raw.write(errorEvent);
                        }
                        throw streamError;
                    }
                } else {
                    this.logger.warn(
                        "streamResult 存在但 textStream 不可用或为空"
                    );
                }

                // 发送完成状态
                try {
                    const completeEvent = `data: ${JSON.stringify({
                        status: "completed",
                        message: "SVG 生成完成",
                        id: generation.id,
                    } as CustomStreamResponse)}\n\n`;

                    const writeResult = reply.raw.write(completeEvent);
                    this.logger.log(
                        `完成状态写入结果：${
                            writeResult ? "成功" : "缓冲区已满"
                        }`
                    );

                    // 强制刷新缓冲区
                    if (reply.raw.flushHeaders) {
                        reply.raw.flushHeaders();
                    }

                    // 额外尝试刷新
                    const rawReplyComplete = reply.raw as {
                        flush?: () => void;
                    };
                    if (typeof rawReplyComplete.flush === "function") {
                        rawReplyComplete.flush();
                    }
                } catch (e) {
                    this.logger.error(
                        `发送完成状态更新时出错，用户 ID: ${userId}，错误信息：${e}`
                    );
                    if (!hasEnded) {
                        try {
                            reply.raw.end();
                            hasEnded = true;
                        } catch (endError) {
                            this.logger.error(
                                `尝试结束响应时出错，用户 ID: ${userId}，错误信息：${endError}`
                            );
                        }
                    }
                    throw e; // 重新抛出错误，让外层 catch 捕获
                }
                this.logger.log(
                    `AI 生成完成，用户 ID: ${userId}，生成 ID: ${generation.id}，生成内容：${processedSvgContent}`
                );
                // 将 AI 返回的 SVG 保存到数据库
                await this.prismaService.svgVersion.create({
                    data: {
                        generationId: generation.id,
                        svgContent: this.cleanSvgContent(processedSvgContent),
                        // 存储原始内容到 svgModifyList
                        svgModifyList: [
                            {
                                content: processedSvgContent,
                                timestamp: new Date().toISOString(),
                                editedBy: userId,
                            },
                        ],
                        versionNumber: 1,
                        isAiGenerated: true,
                    },
                });

                // 结束响应，只有在响应还没结束的情况下才结束
                if (!hasEnded) {
                    reply.raw.end();
                    hasEnded = true;
                }

                // 减少用户积分
                await this.prismaService.user.update({
                    where: { id: userId },
                    data: {
                        remainingCredits: { decrement: 1 },
                    },
                });
            } catch (error) {
                // 如果 API 调用失败，将错误信息传递给前端
                const errorMessage = this.parseAIError(error);
                this.logger.error("API 调用错误：", errorMessage, hasEnded);
                const errorEvent = `data: ${JSON.stringify({
                    status: "error",
                    message: `生成SVG时出错： ${errorMessage}`,
                    id: generation.id,
                } as CustomStreamResponse)}\n\n`;

                // 只有在响应还没结束的情况下才写入和结束
                if (!hasEnded) {
                    reply.raw.write(errorEvent);
                    reply.raw.end();
                    hasEnded = true;
                }
            }
        } catch (error) {
            // 处理初始化或数据库错误
            const errorMessage =
                error instanceof Error ? error.message : "未知错误";
            console.error("初始化错误：", errorMessage);

            const errorEvent = `data: ${JSON.stringify({
                status: "error",
                message: `生成SVG时出错: ${errorMessage}`,
            } as CustomStreamResponse)}\n\n`;

            // 只有在响应还没结束的情况下才写入和结束
            if (!hasEnded) {
                reply.raw.write(errorEvent);
                reply.raw.end();
                hasEnded = true;
            }
        } finally {
            // 最后确保响应一定结束
            if (!hasEnded && !reply.raw.writableEnded) {
                try {
                    const finalErrorEvent = `data: ${JSON.stringify({
                        status: "error",
                        message: "生成过程意外中断",
                    } as CustomStreamResponse)}\n\n`;
                    reply.raw.write(finalErrorEvent);
                    reply.raw.end();
                } catch (e) {
                    console.error("尝试关闭响应时出错：", e);
                }
            }
        }
    }

    /**
     * 更新 SVG 版本内容并记录修改历史
     * @param versionId SVG 版本 ID
     * @param svgContent 新的 SVG 内容
     * @param userId 用户 ID
     * @returns 更新后的 SVG 版本数据
     */
    public async updateSvgVersion(
        versionId: number,
        svgContent: string,
        userId: number
    ): Promise<SvgVersionData> {
        // 清理 SVG 内容，确保只包含有效的 SVG 代码
        const cleanedSvgContent = this.cleanSvgContent(svgContent);

        // 查找现有版本
        const existingVersion = await this.prismaService.svgVersion.findUnique({
            where: { id: versionId },
        });

        if (!existingVersion) {
            throw new NotFoundException(`SVG 版本 ID ${versionId} 不存在`);
        }

        // 准备修改记录
        const modifyRecord: SvgModifyRecord = {
            content: cleanedSvgContent, // 保存当前内容作为历史记录
            timestamp: new Date().toISOString(),
            editedBy: userId,
        };

        // 获取现有的修改历史
        let modifyList: SvgModifyRecord[] = [];
        if (existingVersion.svgModifyList) {
            try {
                // 安全地将 JSON 转换为 SvgModifyRecord 数组
                const rawList = existingVersion.svgModifyList as unknown;
                if (Array.isArray(rawList)) {
                    modifyList = rawList.filter(
                        (item) =>
                            typeof item === "object" &&
                            item !== null &&
                            "content" in item &&
                            "timestamp" in item &&
                            "editedBy" in item
                    ) as SvgModifyRecord[];
                }
            } catch (e) {
                console.error("解析修改历史失败：", e);
                modifyList = [];
            }
        }

        // 添加新的修改记录
        // 限制修改历史记录为最新的 10 条
        modifyList.unshift(modifyRecord);
        if (modifyList.length > 10) {
            // 如果超过 10 条，删除最旧的一条记录（数组中的第一个元素）
            modifyList.pop();
        }

        // 更新版本
        const updatedVersion = await this.prismaService.svgVersion.update({
            where: { id: versionId },
            data: {
                svgContent: cleanedSvgContent, // 更新为新内容
                svgModifyList: modifyList as unknown as Prisma.InputJsonValue, // 更新修改历史
                lastEditedAt: new Date(),
                lastEditedBy: userId,
            },
        });

        return new SvgVersionData(updatedVersion);
    }

    /**
     * 查询公开的 SVG 生成内容，支持分页，返回包含最新版本的生成记录
     *
     * @param page 页码（从 1 开始）
     * @param pageSize 每页数量
     * @returns 包含分页 SVG 生成内容及总数的对象
     */
    public async findPublicPaginated(
        page: number,
        pageSize: number
    ): Promise<{ items: SvgGenerationWithVersionData[]; total: number }> {
        const skip = (page - 1) * pageSize;
        const take = pageSize;

        // 获取公开的生成记录总数
        const total = await this.prismaService.svgGeneration.count({
            where: { isPublic: true },
        });

        // 获取分页后的公开生成记录
        const generations = await this.prismaService.svgGeneration.findMany({
            where: { isPublic: true },
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: {
                svgVersions: {
                    orderBy: { versionNumber: "desc" },
                    take: 1,
                },
            },
        });

        // 转换为 DTO，包含最新版本
        const generationsWithVersions = generations.map((generation) => {
            const latestVersion = generation.svgVersions[0]
                ? new SvgVersionData(generation.svgVersions[0])
                : undefined;
            return new SvgGenerationWithVersionData(generation, latestVersion);
        });

        return { items: generationsWithVersions, total };
    }

    /**
     * 更新 SVG 生成记录的公开状态
     *
     * @param generationId SVG 生成记录 ID
     * @param isPublic 是否公开
     * @returns 更新后的 SVG 生成记录
     */
    public async updatePublicStatus(
        generationId: number,
        isPublic: boolean
    ): Promise<SvgGenerationData> {
        // 检查记录是否存在
        const generation = await this.prismaService.svgGeneration.findUnique({
            where: { id: generationId },
        });

        if (!generation) {
            throw new NotFoundException(
                `未找到 ID 为${generationId}的 SVG 生成记录`
            );
        }

        // 更新公开状态
        const updatedGeneration = await this.prismaService.svgGeneration.update(
            {
                where: { id: generationId },
                data: { isPublic },
            }
        );

        return new SvgGenerationData(updatedGeneration);
    }

    /**
     * 准备配置对象，处理图片和文件数据
     *
     * @private
     * @param data SVG 生成详情
     * @param height 计算后的高度
     * @returns 处理后的配置对象
     */
    private prepareConfiguration(
        data: SvgGenerationInput,
        height: number
    ): Record<string, any> {
        // 创建配置对象，包含宽高信息
        const configWithSize: Record<string, any> = {
            ...((data.configuration as Record<string, unknown>) || {}),
            width: this.SVG_WIDTH,
            height,
            aspectRatio: data.aspectRatio || "1:1",
        };

        // 定义类型安全的图片和文件信息
        type FileInfo = {
            data: string;
            mimeType: string;
        };

        // 如果有图片数据，确保正确存储到配置对象中，而不是单独的列
        if (data.image) {
            // 对于二进制数据，转换为 Base64
            if (
                data.image instanceof Uint8Array ||
                Buffer.isBuffer(data.image) ||
                data.image instanceof ArrayBuffer
            ) {
                let buffer: Buffer;

                if (Buffer.isBuffer(data.image)) {
                    buffer = data.image;
                } else if (data.image instanceof Uint8Array) {
                    buffer = Buffer.from(data.image);
                } else {
                    buffer = Buffer.from(new Uint8Array(data.image));
                }

                // 修改这里，使用 "config_image" 作为键，避免被误解为 image_data 列
                configWithSize.config_image = `data:image/png;base64,${buffer.toString(
                    "base64"
                )}`;
            } else if (typeof data.image === "string") {
                // 字符串直接存储（假设它是 URL 或已经是 Base64）
                configWithSize.config_image = data.image;
            }
        }

        // 如果有文件数据，确保正确存储
        if (data.file && data.file.data) {
            const fileData = data.file.data;
            const mimeType = data.file.mimeType;

            // 对于二进制数据，转换为 Base64
            if (
                fileData instanceof Uint8Array ||
                Buffer.isBuffer(fileData) ||
                fileData instanceof ArrayBuffer
            ) {
                let buffer: Buffer;

                if (Buffer.isBuffer(fileData)) {
                    buffer = fileData;
                } else if (fileData instanceof Uint8Array) {
                    buffer = Buffer.from(fileData);
                } else {
                    buffer = Buffer.from(new Uint8Array(fileData));
                }

                configWithSize.fileContent = {
                    data: `data:${mimeType};base64,${buffer.toString(
                        "base64"
                    )}`,
                    mimeType,
                } as FileInfo;
            } else if (typeof fileData === "string") {
                // 字符串直接存储
                configWithSize.fileContent = {
                    data: fileData,
                    mimeType,
                } as FileInfo;
            }
        }

        return configWithSize;
    }

    /**
     * 获取用于生成 SVG 的提示词
     *
     * @param type 提示词类型，"base"使用默认提示词，"custom"不使用提示词
     * @param data SVG 生成输入数据
     * @param width SVG 宽度
     * @param height SVG 高度
     * @returns 包含 fullPrompt 和 systemPrompt 的对象，或者空对象
     */
    private getPrompts(
        type: string,
        data: SvgGenerationInput,
        width: number,
        height: number
    ): {
        fullPrompt?: string;
        systemPrompt?: string;
    } {
        if (type === "custom") {
            return {
                fullPrompt: "",
                systemPrompt: "",
            }; // 不使用提示词
        }

        // 默认提示词 (base)
        const fullPrompt = `请根据提供的主题或内容，创建一个独特、引人注目且技术精湛的 SVG 图：
[${data.inputContent}]`;

        const systemPrompt = `你是一名专业的图形设计师和 SVG 开发专家，对视觉美学和技术实现有极高造诣。
你是超级创意助手，精通所有现代设计趋势和 SVG 技术。你的任务是将文本描述转换为高质量的 SVG 代码。

## 重要：输出格式要求
- 你的回复必须且只能包含一个完整的 SVG 代码，不包含任何其他内容
- 不要添加任何前言、解释、标记（如\`\`\`svg）或结语
- 不要描述你的思考过程或设计理念
- 不要在SVG代码前后添加任何文本

## 内容要求
- 保持原始主题的核心信息，但以更具视觉冲击力的方式呈现，默认背景白色
- 可搜索补充其他视觉元素或设计灵感，目的为增强海报的表现力

## 设计风格
- 根据主题选择合适的设计风格，优先使用：${
            data.style || "极简现代"
        }风格的视觉设计
- 使用强烈的视觉层次结构，确保信息高效传达
- 配色方案应富有表现力且和谐，符合主题情感
- 字体选择考究，混合使用不超过三种字体，确保可读性与美感并存
- 充分利用 SVG 的矢量特性，呈现精致细节和锐利边缘

## 技术规范
- 使用纯 SVG 格式，确保无损缩放和最佳兼容性
- 代码整洁，结构清晰，包含适当注释
- 优化 SVG 代码，删除不必要的元素和属性
- 实现适当的动画效果（如果需要），使用 SVG 原生动画能力
- SVG 总元素数量不应超过 200 个，确保渲染效率
- 避免使用实验性或低兼容性的 SVG 特性

## 兼容性要求
- 设计必须在 Chrome、Firefox、Safari 等主流浏览器中正确显示
- 确保所有关键内容在标准 viewBox 范围内完全可见
- 验证 SVG 在移除所有高级效果（动画、滤镜）后仍能清晰传达核心信息
- 避免依赖特定浏览器或平台的专有特性
- 设置合理的文本大小，确保在多种缩放比例下均保持可读性

## 尺寸与比例
- 尺寸为 viewBox="0 0 ${width} ${height}"
- 不要添加width/height属性
- 核心内容应位于视图中心区域，避免边缘布局

## 图形与视觉元素
- 创建原创矢量图形，展现主题的本质
- 使用渐变、图案和滤镜等 SVG 高级特性增强视觉效果，但每个 SVG 限制在 3 种滤镜以内
- 精心设计的构图，确保视觉平衡和动态张力
- 避免过度拥挤的设计，避免元素被完全遮挡
- 装饰元素不应干扰或掩盖主要信息
- 所有元素都在viewBox范围内

## 视觉层次与排版
- 建立清晰的视觉导向，引导观众视线
- 文字排版精致，考虑中文字体的特性和美感
- 标题、副标题和正文之间有明确区分
- 使用大小、粗细、颜色和位置创建层次感
- 确保所有文字内容在视觉设计中的优先级高于装饰元素

## 性能优化
- 确保 SVG 文件大小适中，避免不必要的复杂路径
- 正确使用 SVG 元素（如 path、rect、circle 等）
- 优化路径数据，删除冗余点和曲线
- 合并可合并的路径和形状，减少总元素数
- 简化复杂的形状，使用基本元素组合而非复杂路径
- 避免过大的阴影和模糊效果，它们在某些环境中可能导致性能问题

## 严格输出格式
- 直接输出SVG代码，不添加任何其他文本、标记或注释
- 回复中必须以<svg开头，以</svg>结尾
- 不要在SVG前后添加任何说明性文字或代码块标记
- 这一点极其重要：无论如何都只输出纯SVG代码，没有其他任何内容

你的输出应该是这样的格式：
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
    <!-- SVG内容 -->
</svg>`;

        return { fullPrompt, systemPrompt };
    }

    /**
     * 根据宽高比计算高度
     * 支持的格式："16:9", "4:3", "1:1" 等
     *
     * @private
     * @param aspectRatio 宽高比字符串
     * @returns 计算出的高度
     */
    private calculateHeightFromAspectRatio(aspectRatio: string): number {
        if (!aspectRatio || !aspectRatio.includes(":")) {
            return this.SVG_WIDTH; // 默认为正方形
        }

        try {
            const [width, height] = aspectRatio.split(":").map(Number);
            if (width <= 0 || height <= 0) {
                return this.SVG_WIDTH;
            }
            return Math.round((this.SVG_WIDTH * height) / width);
        } catch (e) {
            return this.SVG_WIDTH; // 解析失败则返回默认值
        }
    }

    /**
     * 清理 SVG 内容，提取纯 SVG 代码
     * 移除可能存在的 Markdown 代码块标记和其他非 SVG 内容
     * 如果无法提取有效的 SVG，则返回默认的 AI 生成内容
     *
     * @private
     * @param svgContent 原始 SVG 内容
     * @returns 清理后的纯 SVG 代码
     */
    private cleanSvgContent(svgContent: string): string {
        // 处理空内容情况
        if (!svgContent || svgContent.trim() === "") {
            return this.getDefaultSvg("无法解析内容");
        }

        // 如果已经是合法的完整SVG，直接返回
        if (this.isValidFullSvg(svgContent)) {
            return svgContent;
        }

        // 移除各种可能的代码块标记和前导/尾随空白
        const cleaned = svgContent
            .replace(/```(svg|xml|html)?\s*/gi, "") // 删除开始的代码块标记
            .replace(/```\s*$/g, "") // 删除结束的代码块标记
            .trim();

        // 尝试提取完整的SVG标签
        const fullSvgRegex = /<svg[\s\S]*?<\/svg>/i;
        const fullMatch = cleaned.match(fullSvgRegex);

        if (fullMatch && fullMatch[0]) {
            const extractedSvg = fullMatch[0];
            if (this.isValidFullSvg(extractedSvg)) {
                return extractedSvg;
            }
        }

        // 尝试处理不完整的 SVG（有开始标签但没有结束标签）
        const openTagRegex = /<svg[^>]*>/i;
        const openTagMatch = cleaned.match(openTagRegex);

        if (openTagMatch && openTagMatch[0]) {
            const svgStart = cleaned.indexOf(openTagMatch[0]);
            const svgContentFragment = cleaned.substring(svgStart);

            // 如果有开始标签但没有结束标签，添加结束标签
            if (!svgContentFragment.includes("</svg>")) {
                return `${svgContentFragment}</svg>`;
            }

            // 提取从开始标签到首个结束标签的完整内容
            const closingTagIndex = svgContentFragment.indexOf("</svg>") + 6;
            if (closingTagIndex > 6) {
                const extractedSvg = svgContentFragment.substring(
                    0,
                    closingTagIndex
                );
                if (this.isValidFullSvg(extractedSvg)) {
                    return extractedSvg;
                }
            }
        }

        // 尝试处理只有内容片段的情况（无 SVG 标签但有 SVG 元素）
        if (
            cleaned.match(
                /<(circle|rect|path|g|text|line|polyline|polygon|ellipse)[\s\S]*?>/i
            )
        ) {
            const svgWrapper = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.SVG_WIDTH} ${this.SVG_WIDTH}">${cleaned}</svg>`;
            if (this.isValidFullSvg(svgWrapper)) {
                return svgWrapper;
            }
        }

        // 兜底：无法提取到有效 SVG 内容时，返回默认 SVG
        return this.getDefaultSvg("解析失败");
    }

    /**
     * 验证是否为有效的完整 SVG
     * @private
     * @param svgContent SVG 内容
     * @returns 是否为有效的完整 SVG
     */
    private isValidFullSvg(svgContent: string): boolean {
        // 基本验证：必须包含开始和结束标签
        if (!svgContent.match(/<svg[^>]*>[\s\S]*<\/svg>/i)) {
            return false;
        }

        // 验证必要的属性：xmlns
        let validatedSvg = svgContent;
        if (!validatedSvg.includes('xmlns="http://www.w3.org/2000/svg"')) {
            // 尝试修复缺少 xmlns 的 SVG
            validatedSvg = validatedSvg.replace(
                /<svg/i,
                '<svg xmlns="http://www.w3.org/2000/svg"'
            );
        }

        // 尝试解析 SVG（简单验证结构）
        try {
            // 确保是单个 SVG 根元素
            const openTags = validatedSvg.match(/<svg/gi);
            const closeTags = validatedSvg.match(/<\/svg>/gi);

            return !!(
                openTags &&
                closeTags &&
                openTags.length === 1 &&
                closeTags.length === 1
            );
        } catch (e) {
            return false;
        }
    }

    /**
     * 获取默认的 SVG 内容
     * @private
     * @param message 错误信息
     * @returns 默认 SVG 内容
     */
    private getDefaultSvg(message: string): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.SVG_WIDTH} ${this.SVG_WIDTH}" width="${this.SVG_WIDTH}" height="${this.SVG_WIDTH}">
<rect width="100%" height="100%" fill="#f8f9fa" />
<text x="50%" y="50%" font-family="Arial" font-size="24" text-anchor="middle" dominant-baseline="middle" fill="#6c757d">
    ${message} - AI 生成内容将稍后显示
</text>
<text x="50%" y="58%" font-family="Arial" font-size="16" text-anchor="middle" dominant-baseline="middle" fill="#6c757d">
    请稍候或尝试重新生成
</text>
</svg>`;
    }

    /**
     * 解析 AI 错误信息，处理多种嵌套错误格式
     *
     * @private
     * @param error 错误对象
     * @returns 格式化的用户友好错误消息
     */
    private parseAIError(error: any): string {
        // 默认错误信息
        let errorMessage = "当前无可用模型，请稍后重试";

        try {
            // 如果是标准 Error 对象
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            // 检查是否是对象
            else if (typeof error === "object" && error !== null) {
                // 1. 先检查直接的 error.message
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                if (error.message) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    errorMessage = String(error.message);
                }

                // 2. 检查 AI_RetryError 结构
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                if (error.name === "AI_RetryError") {
                    // 2.1 优先使用 lastError
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    if (error.lastError?.data?.error?.message) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        const msg = String(error.lastError.data.error.message);
                        if (msg.includes("无可用渠道")) {
                            return "AI 模型暂时不可用，请稍后再试或选择其他模型";
                        }
                        return msg;
                    }

                    // 2.2 使用 errors 数组中的第一个错误
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    if (
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        Array.isArray(error.errors) &&
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        error.errors.length > 0
                    ) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                        const firstError = error.errors[0];
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        if (firstError.data?.error?.message) {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            const msg = String(firstError.data.error.message);
                            if (msg.includes("无可用渠道")) {
                                return "AI 模型暂时不可用，请稍后再试或选择其他模型";
                            }
                            return msg;
                        }

                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        if (firstError.responseBody) {
                            try {
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                                const responseData = JSON.parse(
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
                                    firstError.responseBody
                                );
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                if (responseData.error?.message) {
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                    const msg = String(
                                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                        responseData.error.message
                                    );
                                    if (msg.includes("无可用渠道")) {
                                        return "AI 模型暂时不可用，请稍后再试或选择其他模型";
                                    }
                                    return msg;
                                }
                            } catch (e) {
                                // 解析 JSON 失败，忽略
                            }
                        }
                    }
                }

                // 3. 检查 error.data.error.message 结构
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                if (error.data?.error?.message) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    const msg = String(error.data.error.message);
                    if (msg.includes("无可用渠道")) {
                        return "AI 模型暂时不可用，请稍后再试或选择其他模型";
                    }
                    return msg;
                }

                // 4. 尝试解析 error.data
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                if (error.data && typeof error.data === "object") {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    if (error.data.message) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        return String(error.data.message);
                    }
                }
            }
        } catch (e) {
            // 解析过程中出错，返回默认错误信息
            console.error("解析 AI 错误时出错", e);
        }

        return errorMessage;
    }
}
