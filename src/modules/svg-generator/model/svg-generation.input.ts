import { ApiProperty } from "@nestjs/swagger";
import { JsonValue } from "@prisma/client/runtime/library";

export class SvgGenerationInput {
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
        description: "宽高比例",
        example: "16:9",
        required: false,
    })
    public readonly aspectRatio?: string;

    @ApiProperty({
        description: "Additional configuration parameters",
        required: false,
    })
    public readonly configuration?: JsonValue;
}
