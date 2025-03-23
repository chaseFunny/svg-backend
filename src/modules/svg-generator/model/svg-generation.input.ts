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
        description: "是否使用 thinking 模型进行生成",
        example: "base",
        required: false,
        enum: ["base", "thinking"],
        default: "base",
    })
    public readonly isThinking?: string;

    @ApiProperty({
        description: "图片数据（可以是 Base64 编码字符串、URL 或二进制数据）",
        required: false,
    })
    public readonly image?: string | Uint8Array | Buffer | ArrayBuffer;

    @ApiProperty({
        description: "文件数据（可以是 Base64 编码字符串、URL 或二进制数据）",
        required: false,
    })
    public readonly file?: {
        data: string | Uint8Array | Buffer | ArrayBuffer;
        mimeType: string;
    };

    @ApiProperty({
        description: "生成类型，决定系统 prompt 和 prompt 内容",
        example: "default",
        required: false,
        default: "default",
    })
    public readonly type?: string;

    @ApiProperty({
        description: "Additional configuration parameters",
        required: false,
    })
    public readonly configuration?: JsonValue;
}
