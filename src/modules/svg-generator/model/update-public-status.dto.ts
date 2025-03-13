import { ApiProperty } from "@nestjs/swagger";

/**
 * 更新SVG生成记录公开状态的数据传输对象
 */
export class UpdatePublicStatusDto {
    @ApiProperty({
        description: "是否公开SVG生成记录",
        example: true,
    })
    public isPublic: boolean;
}
