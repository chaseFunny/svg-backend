import { ApiProperty } from "@nestjs/swagger";
import { Prisma, SvgVersion } from "@prisma/client";

// 定义修改历史记录的接口
export interface SvgModifyRecord {
    content: string;
    timestamp: string;
    editedBy: number;
}

// 扩展SvgVersion类型以包含新字段
type SvgVersionWithModifyList = SvgVersion & {
    svgModifyList?: Prisma.JsonValue;
    lastEditedAt?: Date | null;
    lastEditedBy?: number | null;
};

export class SvgVersionData {
    @ApiProperty({ description: "Version unique ID", example: "1" })
    public readonly id: number;

    @ApiProperty({ description: "Generation ID", example: "1" })
    public readonly generationId: number;

    @ApiProperty({ description: "SVG content", example: "<svg>...</svg>" })
    public readonly svgContent: string;

    @ApiProperty({
        description: "SVG修改历史",
        example: [
            {
                content: "<svg>...</svg>",
                timestamp: "2024-03-05T10:00:00Z",
                editedBy: 3,
            },
        ],
        required: false,
    })
    public readonly svgModifyList?: SvgModifyRecord[];

    @ApiProperty({ description: "Version number", example: 1 })
    public readonly versionNumber: number;

    @ApiProperty({
        description: "Whether version is AI generated",
        example: true,
    })
    public readonly isAiGenerated: boolean;

    @ApiProperty({
        description: "Creation timestamp",
        example: "2025-03-02T10:30:00Z",
    })
    public readonly createdAt: Date;

    @ApiProperty({
        description: "Last edit timestamp",
        example: "2025-03-05T10:30:00Z",
        required: false,
    })
    public readonly lastEditedAt?: Date;

    @ApiProperty({
        description: "Last editor user ID",
        example: 3,
        required: false,
    })
    public readonly lastEditedBy?: number;

    public constructor(entity: SvgVersionWithModifyList) {
        this.id = entity.id;
        this.generationId = entity.generationId;
        this.svgContent = entity.svgContent;
        this.versionNumber = entity.versionNumber;
        this.isAiGenerated = entity.isAiGenerated;
        this.createdAt = entity.createdAt;
        this.lastEditedAt = entity.lastEditedAt ?? undefined;
        this.lastEditedBy = entity.lastEditedBy ?? undefined;

        // 安全地处理JSON数据
        if (entity.svgModifyList) {
            try {
                const modifyList = entity.svgModifyList as unknown;
                // 确保是数组且包含所需字段
                if (
                    Array.isArray(modifyList) &&
                    modifyList.every(
                        (item) =>
                            typeof item === "object" &&
                            item !== null &&
                            "content" in item &&
                            "timestamp" in item &&
                            "editedBy" in item
                    )
                ) {
                    this.svgModifyList = modifyList as SvgModifyRecord[];
                } else {
                    this.svgModifyList = [];
                }
            } catch {
                this.svgModifyList = [];
            }
        } else {
            this.svgModifyList = [];
        }
    }
}
