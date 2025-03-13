import { ApiProperty } from "@nestjs/swagger";

export class SvgVersionUpdateDto {
    @ApiProperty({
        description: "新的SVG内容",
        example: '<svg xmlns="http://www.w3.org/2000/svg">...</svg>',
    })
    public readonly svgContent: string;

    @ApiProperty({
        description: "用户ID",
        example: 3,
    })
    public readonly userId: number;
}
