import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    HttpStatus,
    Param,
    Post,
    Put,
    Query,
    Req,
    Res,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { FastifyReply, FastifyRequest } from "fastify";

import { Public } from "../../auth/decorator/public.decorator";
import { LoggerService } from "../../common";

import { SvgGenerationPipe, UpdatePublicStatusPipe } from "../flow";
import {
    PaginatedSvgGenerationResponse,
    SvgGenerationData,
    SvgGenerationInput,
    SvgGenerationWithVersionData,
    SvgVersionData,
    SvgVersionUpdateDto,
    UpdatePublicStatusDto,
} from "../model";
import { SvgGenerationService } from "../service";

// 定义请求用户接口
interface RequestWithUser extends FastifyRequest {
    user: {
        [key: string]: any;
        id: number;
        role: string;
    };
    token?: string;
}

@Controller("svg-generator/generations")
@ApiTags("svg-generations")
@ApiBearerAuth()
export class SvgGeneratorController {
    public constructor(
        private readonly logger: LoggerService,
        private readonly svgGenerationService: SvgGenerationService
    ) {}

    @Get("public")
    @Public()
    @ApiOperation({ summary: "查询公开的 SVG 生成内容，无需认证" })
    @ApiQuery({ name: "page", required: false, description: "页码，默认为 1" })
    @ApiQuery({
        name: "pageSize",
        required: false,
        description: "每页大小，默认为 20，最大为 24",
    })
    @ApiResponse({
        status: HttpStatus.OK,
        type: PaginatedSvgGenerationResponse,
    })
    public async findPublicGenerations(
        @Query("page") page?: string,
        @Query("pageSize") pageSize?: string
    ): Promise<PaginatedSvgGenerationResponse> {
        // 处理分页参数
        const pageNumber = page ? Math.max(1, parseInt(page, 10)) : 1;
        let pageSizeNumber = pageSize ? parseInt(pageSize, 10) : 20;
        // 限制每页大小不超过 24
        pageSizeNumber = Math.min(24, Math.max(1, pageSizeNumber));

        // 查询公开的 SVG 生成内容
        const result = await this.svgGenerationService.findPublicPaginated(
            pageNumber,
            pageSizeNumber
        );

        return new PaginatedSvgGenerationResponse(
            result.items,
            result.total,
            pageNumber,
            pageSizeNumber
        );
    }

    @Get()
    @ApiOperation({ summary: "Find SVG generations" })
    @ApiQuery({ name: "userId", required: false })
    @ApiQuery({ name: "page", required: false, description: "页码，默认为 1" })
    @ApiQuery({
        name: "pageSize",
        required: false,
        description: "每页大小，默认为 20，最大为 24",
    })
    @ApiResponse({
        status: HttpStatus.OK,
        type: PaginatedSvgGenerationResponse,
    })
    public async findGenerations(
        @Req() request: RequestWithUser,
        @Query("userId") userId?: string,
        @Query("page") page?: string,
        @Query("pageSize") pageSize?: string
    ): Promise<PaginatedSvgGenerationResponse> {
        // 处理分页参数
        const pageNumber = page ? Math.max(1, parseInt(page, 10)) : 1;
        let pageSizeNumber = pageSize ? parseInt(pageSize, 10) : 20;
        // 限制每页大小不超过 24
        pageSizeNumber = Math.min(24, Math.max(1, pageSizeNumber));

        let result: { items: SvgGenerationWithVersionData[]; total: number };

        // 根据是否有 userId 进行不同的查询
        if (userId) {
            result = await this.svgGenerationService.findByUserIdPaginated(
                parseInt(userId, 10),
                pageNumber,
                pageSizeNumber
            );
        } else {
            // 检查当前用户是否为管理员
            if (request.user.role !== "ADMIN") {
                throw new ForbiddenException(
                    "没有权限查看所有 SVG 生成记录，只有管理员可以访问此功能"
                );
            }

            result = await this.svgGenerationService.findAllPaginated(
                pageNumber,
                pageSizeNumber
            );
        }

        return new PaginatedSvgGenerationResponse(
            result.items,
            result.total,
            pageNumber,
            pageSizeNumber
        );
    }

    @Post()
    @ApiOperation({ summary: "Create SVG generation" })
    @ApiResponse({ status: HttpStatus.CREATED, type: SvgGenerationData })
    public async createGeneration(
        @Body(SvgGenerationPipe) input: SvgGenerationInput,
        @Query("userId") userId: string
    ): Promise<SvgGenerationData> {
        const generation = await this.svgGenerationService.create(
            parseInt(userId, 10),
            input
        );
        this.logger.info(`Created new SVG generation with ID ${generation.id}`);
        return generation;
    }

    @Post("stream")
    @ApiOperation({ summary: "Create SVG generation with stream response" })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Server-Sent Events stream for SVG generation",
    })
    public async createGenerationStream(
        @Body(SvgGenerationPipe) input: SvgGenerationInput,
        @Query("userId") userId: string,
        @Res() reply: FastifyReply
    ): Promise<void> {
        this.logger.info(
            `Starting streamed SVG generation for user ${userId} with prompt: ${input.inputContent.substring(
                0,
                100
            )}... Model: ${
                input.isThinking === "thinking"
                    ? "claude-3-7-sonnet-latest-thinking"
                    : "claude-3-7-sonnet-all"
            }`
        );
        await this.svgGenerationService.createStream(
            parseInt(userId, 10),
            input,
            reply
        );
    }

    @Get(":id/versions")
    @ApiOperation({ summary: "Get versions of an SVG generation" })
    @ApiResponse({ status: HttpStatus.OK, isArray: true, type: SvgVersionData })
    public async getVersions(
        @Param("id") id: string
    ): Promise<SvgVersionData[]> {
        return this.svgGenerationService.findVersions(parseInt(id, 10));
    }

    @Put("versions/:id")
    @ApiOperation({ summary: "更新 SVG 版本内容" })
    @ApiResponse({
        status: HttpStatus.OK,
        type: SvgVersionData,
    })
    public async updateSvgVersion(
        @Param("id") id: string,
        @Body() updateDto: SvgVersionUpdateDto
    ): Promise<SvgVersionData> {
        return this.svgGenerationService.updateSvgVersion(
            Number(id),
            updateDto.svgContent,
            updateDto.userId
        );
    }

    @Put(":id/public-status")
    @ApiOperation({ summary: "更新 SVG 生成记录的公开状态（仅管理员）" })
    @ApiResponse({
        status: HttpStatus.OK,
        type: SvgGenerationData,
    })
    public async updatePublicStatus(
        @Param("id") id: string,
        @Body(UpdatePublicStatusPipe) updateDto: UpdatePublicStatusDto,
        @Req() request: RequestWithUser
    ): Promise<SvgGenerationData> {
        // 检查当前用户是否为管理员
        if (request.user.role !== "ADMIN") {
            throw new ForbiddenException(
                "只有管理员可以更新 SVG 生成记录的公开状态"
            );
        }

        return this.svgGenerationService.updatePublicStatus(
            parseInt(id, 10),
            updateDto.isPublic
        );
    }
}
