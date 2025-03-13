/* eslint-disable max-classes-per-file */
import { ApiProperty } from "@nestjs/swagger";
import { SvgGeneration } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";
import { SvgVersionData } from "./svg-version.data";

export class SvgGenerationWithVersionData {
    @ApiProperty({ description: "Generation unique ID", example: "1" })
    public readonly id: number;

    @ApiProperty({ description: "User ID", example: "1" })
    public readonly userId: number;

    @ApiProperty({
        description: "Input content for generation",
        example: "A mountain landscape with sunset",
    })
    public readonly inputContent: string;

    @ApiProperty({
        description: "Style preference",
        example: "Minimalist",
        required: false,
    })
    public readonly style?: string;

    @ApiProperty({
        description: "Aspect ratio",
        example: "16:9",
        required: false,
    })
    public readonly aspectRatio?: string;

    @ApiProperty({
        description: "Additional configuration parameters",
        required: false,
        type: Object,
    })
    public readonly configuration: JsonValue;

    @ApiProperty({
        description: "AI models used for generation",
        example: ["deepseek", "claude3.7"],
    })
    public readonly modelNames: string[];

    @ApiProperty({
        description: "Title of the generation",
        example: "Mountain Sunset",
        required: false,
    })
    public readonly title?: string;

    @ApiProperty({
        description: "Whether the generation is public",
        example: false,
    })
    public readonly isPublic: boolean;

    @ApiProperty({
        description: "Creation timestamp",
        example: "2025-03-02T10:30:00Z",
    })
    public readonly createdAt: Date;

    @ApiProperty({
        description: "Latest SVG version data",
        type: SvgVersionData,
    })
    public readonly latestVersion?: SvgVersionData;

    public constructor(entity: SvgGeneration, latestVersion?: SvgVersionData) {
        this.id = entity.id;
        this.userId = entity.userId;
        this.inputContent = entity.inputContent;
        this.style = entity.style || undefined;
        this.aspectRatio = entity.aspectRatio || undefined;
        this.configuration = entity.configuration;
        this.modelNames = entity.modelNames;
        this.title = entity.title || undefined;
        this.isPublic = entity.isPublic;
        this.createdAt = entity.createdAt;
        this.latestVersion = latestVersion;
    }
}

export class PaginatedSvgGenerationResponse {
    @ApiProperty({
        description: "SVG generations",
        type: [SvgGenerationWithVersionData],
    })
    public readonly items: SvgGenerationWithVersionData[];

    @ApiProperty({ description: "Total count of items", example: 100 })
    public readonly total: number;

    @ApiProperty({ description: "Current page number", example: 1 })
    public readonly page: number;

    @ApiProperty({ description: "Page size", example: 20 })
    public readonly pageSize: number;

    @ApiProperty({ description: "Total number of pages", example: 5 })
    public readonly totalPages: number;

    public constructor(
        items: SvgGenerationWithVersionData[],
        total: number,
        page: number,
        pageSize: number
    ) {
        this.items = items;
        this.total = total;
        this.page = page;
        this.pageSize = pageSize;
        this.totalPages = Math.ceil(total / pageSize);
    }
}
