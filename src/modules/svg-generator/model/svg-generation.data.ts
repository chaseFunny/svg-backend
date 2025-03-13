import { ApiProperty } from "@nestjs/swagger";
import { SvgGeneration } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";

export class SvgGenerationData {
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
        description: "Additional configuration parameters",
        required: false,
        type: Object, // 可以指定为 Object 或者更具体的类型
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
        description: "Creation timestamp",
        example: "2025-03-02T10:30:00Z",
    })
    public readonly createdAt: Date;

    public constructor(entity: SvgGeneration) {
        this.id = entity.id;
        this.userId = entity.userId;
        this.inputContent = entity.inputContent;
        this.style = entity.style || undefined;
        this.configuration = entity.configuration;
        this.modelNames = entity.modelNames;
        this.title = entity.title || undefined;
        this.createdAt = entity.createdAt;
    }
}
