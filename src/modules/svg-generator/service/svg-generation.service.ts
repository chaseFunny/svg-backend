import { createOpenAI } from "@ai-sdk/openai";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { streamText } from "ai";
import type { FastifyReply } from "fastify";
import { PrismaService } from "../../common";
import {
    SvgGenerationData,
    SvgGenerationInput,
    SvgGenerationWithVersionData,
    SvgModifyRecord,
    SvgVersionData,
} from "../model";

// 自定义响应接口，用于处理OpenAI的流式响应
interface CustomStreamResponse {
    status: string;
    message?: string;
    id?: number;
    chunk?: string;
}

@Injectable()
export class SvgGenerationService {
    private readonly SVG_WIDTH = 800; // 固定SVG宽度为800px

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

        // 转换为DTO，包含最新版本
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

        // 转换为DTO，包含最新版本
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
     * 创建SVG生成（普通方式）
     *
     * @param userId 用户ID
     * @param data SVG生成详情
     * @returns 创建的SVG生成
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
            throw new NotFoundException(`用户ID ${userId} 不存在`);
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
            const configWithSize = {
                ...((data.configuration as Record<string, unknown>) || {}),
                width: this.SVG_WIDTH,
                height,
                aspectRatio: data.aspectRatio || "1:1",
            };

            // 创建生成记录
            const generation = await prisma.svgGeneration.create({
                data: {
                    userId,
                    inputContent: data.inputContent,
                    style: data.style,
                    configuration: configWithSize,
                    modelNames: ["default-model"], // 这将被替换为实际的模型名称
                },
            });

            // 创建初始版本
            const svgPlaceholder =
                '<svg xmlns="http://www.w3.org/2000/svg" ' +
                `viewBox="0 0 ${this.SVG_WIDTH} ${height}" ` +
                `width="${this.SVG_WIDTH}" height="${height}">` +
                '<text x="10" y="50">正在生成SVG...</text></svg>';

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
     * 流式创建SVG生成
     *
     * @param userId 用户ID
     * @param data SVG生成详情
     * @param reply Fastify响应对象，用于流式传输
     */
    public async createStream(
        userId: number,
        data: SvgGenerationInput,
        reply: FastifyReply
    ): Promise<void> {
        // 定义一个变量追踪响应是否已经结束
        let hasEnded = false;

        try {
            // 检查用户是否存在并且有足够的积分
            const user = await this.prismaService.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                throw new NotFoundException(`用户ID ${userId} 不存在`);
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
                "Cache-Control": "no-cache",
                "Content-Encoding": "utf-8",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no", // 禁用Nginx缓冲（如果使用Nginx）
            });

            // 尝试禁用响应缓冲区
            // 注意：Node.js的HTTP响应对象可能有不同实现
            const rawResponse = reply.raw as unknown as {
                socket?: { setNoDelay?: (noDelay: boolean) => void };
            };
            if (
                rawResponse.socket &&
                typeof rawResponse.socket.setNoDelay === "function"
            ) {
                rawResponse.socket.setNoDelay(true);
            }

            // 创建配置对象，包含宽高信息
            const configWithSize = {
                ...((data.configuration as Record<string, unknown>) || {}),
                width: this.SVG_WIDTH,
                height,
                aspectRatio: data.aspectRatio || "1:1",
            };

            // 创建生成记录
            const generation = await this.prismaService.svgGeneration.create({
                data: {
                    userId,
                    inputContent: data.inputContent,
                    style: data.style,
                    configuration: configWithSize,
                    modelNames: ["gpt-4o"], // 更新为实际使用的模型
                },
            });

            // 发送初始状态更新
            try {
                const startEvent = `data: ${JSON.stringify({
                    status: "started",
                    message: "开始生成SVG",
                    id: generation.id,
                } as CustomStreamResponse)}\n\n`;
                reply.raw.write(startEvent);

                // 强制刷新缓冲区
                const rawReplyStart = reply.raw as unknown as {
                    flushHeaders?: () => void;
                };
                if (rawReplyStart.flushHeaders) {
                    rawReplyStart.flushHeaders();
                } else {
                    // 备选方案：使用setTimeout强制微任务队列推进
                    setTimeout(() => {
                        /* 强制微任务队列更新 */
                    }, 0);
                }
            } catch (e) {
                console.error("发送初始状态更新时出错:", e);
                hasEnded = true;
                throw e; // 重新抛出错误，让外层catch捕获
            }

            try {
                // 构建发送给API的提示
                const fullPrompt = `You are an SVG graphic design expert, specializing in knowledge visualization and infographic design.
Please analyze the following content: [${
                    data.inputContent
                }] and create an elegant visual diagram.
Design Process:
1. First, identify the core concepts, relationships, and hierarchical structures in the content
2. Determine the most suitable chart type to express this content (mind map, flowchart, relationship diagram, etc.)
3. Create a visually appealing layout with attention to information flow and hierarchy
4. Apply the "${
                    data.style || "minimalist modern"
                }" style to the overall visual design
Design Principles:
- Clear information hierarchy with distinct primary and secondary elements
- Use appropriate visual metaphors to enhance content understanding
- Ensure overall balance and harmony in the diagram
- Optimize readability and avoid visual clutter
Technical Requirements:
1. Only return valid SVG code, do not include any explanation or markdown format
2. The SVG root element must have viewBox="0 0 ${
                    this.SVG_WIDTH
                } ${height}",disallow width and height attributes
3. Ensure the code is complete with all necessary tags and attributes
4. Code should be concise and optimized, removing redundant elements
5. Use readable fonts and appropriate font sizes
6. Create harmonious color combinations with sufficient contrast
7. The final SVG must be static (no animations) as it will be exported to an image

Please generate complete SVG code that meets the above requirements.`;
                const systemPrompt = `You are a world-class SVG graphic design expert, skilled at transforming complex information into visually engaging diagrams.
You have a deep understanding of information design, visual hierarchy, and color theory.
You only output raw SVG code, without any explanation or markdown formatting.
Your SVG code is always valid, optimized, and visually pleasing.
You carefully design each element to ensure the final diagram is both beautiful and effectively communicates information.`;

                // 创建自定义的OpenAI客户端实例
                const customOpenAI = createOpenAI({
                    apiKey: process.env.ANTHROPIC_API_KEY, // 使用请求提供的apiKey，如果没有则使用环境变量
                    baseURL: process.env.ANTHROPIC_API_URL, // 使用请求提供的baseURL，如果没有则使用默认值
                });
                // 使用Vercel AI SDK的streamText函数
                const streamResult = streamText({
                    model: customOpenAI("claude-3-7-sonnet-20250219"),
                    system: systemPrompt,
                    prompt: fullPrompt,
                    maxTokens: 64000,
                    abortSignal: AbortSignal.timeout(60000 * 10), // 设置 10 分钟超时
                    temperature: 0.1,
                    // 添加事件处理函数
                    onError: (error) => {
                        console.error("AI生成过程中出错:", error);
                        if (!hasEnded) {
                            try {
                                const errorEvent = `data: ${JSON.stringify({
                                    status: "error",
                                    message: `生成SVG时出错： ${
                                        error instanceof Error
                                            ? error.message
                                            : "未知错误"
                                    }`,
                                    id: generation.id,
                                } as CustomStreamResponse)}\n\n`;
                                reply.raw.write(errorEvent);
                            } catch (writeError) {
                                console.error(
                                    "发送错误状态更新时出错:",
                                    writeError
                                );
                            }
                        }
                    },
                });

                let processedSvgContent = ""; // 用于收集处理后的SVG内容

                // 处理流式响应
                for await (const textPart of streamResult.textStream) {
                    // 防止响应已结束情况下继续写入
                    if (hasEnded) break;

                    processedSvgContent += textPart;

                    // 发送每个数据块到前端
                    try {
                        const chunkEvent = `data: ${JSON.stringify({
                            status: "streaming",
                            id: generation.id,
                            chunk: textPart,
                        } as CustomStreamResponse)}\n\n`;

                        reply.raw.write(chunkEvent);

                        // 强制刷新缓冲区，确保数据立即发送给客户端
                        const rawReplyChunk = reply.raw as unknown as {
                            flushHeaders?: () => void;
                        };
                        if (rawReplyChunk.flushHeaders) {
                            rawReplyChunk.flushHeaders();
                        }
                    } catch (e) {
                        console.error("发送数据块时出错:", e);
                        if (!hasEnded) {
                            try {
                                const errorEvent = `data: ${JSON.stringify({
                                    status: "error",
                                    message: "数据传输过程中断",
                                    id: generation.id,
                                } as CustomStreamResponse)}\n\n`;
                                reply.raw.write(errorEvent);
                                reply.raw.end();
                                hasEnded = true;
                            } catch (endError) {
                                console.error("尝试结束响应时出错:", endError);
                            }
                        }
                        throw e; // 重新抛出错误，让外层catch捕获
                    }
                }

                // 发送完成状态
                try {
                    const completeEvent = `data: ${JSON.stringify({
                        status: "completed",
                        message: "SVG生成完成",
                        id: generation.id,
                    } as CustomStreamResponse)}\n\n`;
                    reply.raw.write(completeEvent);

                    // 强制刷新缓冲区
                    const rawReplyComplete = reply.raw as unknown as {
                        flushHeaders?: () => void;
                    };
                    if (rawReplyComplete.flushHeaders) {
                        rawReplyComplete.flushHeaders();
                    }
                } catch (e) {
                    console.error("发送完成状态更新时出错:", e);
                    if (!hasEnded) {
                        try {
                            reply.raw.end();
                            hasEnded = true;
                        } catch (endError) {
                            console.error("尝试结束响应时出错:", endError);
                        }
                    }
                    throw e; // 重新抛出错误，让外层catch捕获
                }

                // 将AI返回的SVG保存到数据库
                await this.prismaService.svgVersion.create({
                    data: {
                        generationId: generation.id,
                        svgContent: this.cleanSvgContent(processedSvgContent),
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
                    data: { remainingCredits: { decrement: 1 } },
                });
            } catch (error) {
                // 如果API调用失败，将错误信息传递给前端
                const errorMessage =
                    error instanceof Error ? error.message : "未知错误";
                console.error("API调用错误:", errorMessage);

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
            console.error("初始化错误:", errorMessage);

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
                    console.error("尝试关闭响应时出错:", e);
                }
            }
        }
    }

    /**
     * 更新SVG版本内容并记录修改历史
     * @param versionId SVG版本ID
     * @param svgContent 新的SVG内容
     * @param userId 用户ID
     * @returns 更新后的SVG版本数据
     */
    public async updateSvgVersion(
        versionId: number,
        svgContent: string,
        userId: number
    ): Promise<SvgVersionData> {
        // 清理SVG内容，确保只包含有效的SVG代码
        const cleanedSvgContent = this.cleanSvgContent(svgContent);

        // 查找现有版本
        const existingVersion = await this.prismaService.svgVersion.findUnique({
            where: { id: versionId },
        });

        if (!existingVersion) {
            throw new NotFoundException(`SVG版本ID ${versionId} 不存在`);
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
                // 安全地将JSON转换为SvgModifyRecord数组
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
                console.error("解析修改历史失败:", e);
                modifyList = [];
            }
        }

        // 添加新的修改记录
        // 限制修改历史记录为最新的10条
        modifyList.unshift(modifyRecord);
        if (modifyList.length > 10) {
            // 如果超过10条，删除最旧的一条记录（数组中的第一个元素）
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
     * 查询公开的SVG生成内容，支持分页，返回包含最新版本的生成记录
     *
     * @param page 页码（从1开始）
     * @param pageSize 每页数量
     * @returns 包含分页SVG生成内容及总数的对象
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

        // 转换为DTO，包含最新版本
        const generationsWithVersions = generations.map((generation) => {
            const latestVersion = generation.svgVersions[0]
                ? new SvgVersionData(generation.svgVersions[0])
                : undefined;
            return new SvgGenerationWithVersionData(generation, latestVersion);
        });

        return { items: generationsWithVersions, total };
    }

    /**
     * 更新SVG生成记录的公开状态
     *
     * @param generationId SVG生成记录ID
     * @param isPublic 是否公开
     * @returns 更新后的SVG生成记录
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
                `未找到ID为${generationId}的SVG生成记录`
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
     * 根据宽高比计算高度
     * 支持的格式: "16:9", "4:3", "1:1" 等
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
     *
     * @private
     * @param svgContent 原始 SVG 内容
     * @returns 清理后的纯 SVG 代码
     */
    private cleanSvgContent(svgContent: string): string {
        // 如果以 <svg 开头，则直接返回
        if (svgContent.startsWith("<svg")) {
            return svgContent;
        }
        if (!svgContent) return svgContent;

        // 移除各种可能的代码块标记
        const cleaned = svgContent
            .replace(/```(svg|xml)?\s*/gi, "") // 删除开始的代码块标记（支持 ```svg 或 ```xml 或 ```）
            .replace(/```\s*$/g, "") // 删除结束的代码块标记
            .trim();

        // 提取 <svg> 到 </svg> 之间的内容
        const svgRegex = /<svg[\s\S]*?<\/svg>/i;
        const match = cleaned.match(svgRegex);

        if (match && match[0]) {
            return match[0];
        }

        // 如果没有找到完整的 SVG 标签，但内容以 <svg 开头
        if (cleaned.match(/<svg[\s\S]*$/i) && !cleaned.includes("</svg>")) {
            // 添加闭合标签
            return `${cleaned}</svg>`;
        }

        // 如果内容包含 </svg> 但不以 <svg 开头
        if (!cleaned.match(/^[\s\S]*<svg/i) && cleaned.includes("</svg>")) {
            // 尝试找到有效内容的开始
            const startIndex = cleaned.indexOf("<");
            if (startIndex >= 0) {
                return `<svg>${cleaned.substring(startIndex)}</svg>`;
            }
        }

        // 如果没有找到匹配的 SVG 标签，检查内容是否包含其他 XML/HTML 元素
        if (cleaned.match(/<\w+[\s\S]*?>[\s\S]*?<\/\w+>/)) {
            // 包装在 SVG 标签中
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.SVG_WIDTH} ${this.SVG_WIDTH}">${cleaned}</svg>`;
        }

        // 如果没有找到任何明显的标签，但可能是 SVG 内的元素内容
        if (cleaned.match(/(\w+="[\s\S]*?"|\w+='[\s\S]*?')/)) {
            // 尝试作为 SVG 元素包装
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.SVG_WIDTH} ${this.SVG_WIDTH}"><g>${cleaned}</g></svg>`;
        }

        // 如果确实没有找到任何 SVG 相关内容，返回原始清理后的内容
        return cleaned;
    }
}
