import { ApiProperty } from "@nestjs/swagger";

export class SendVerificationCodeDto {
    @ApiProperty({ description: "邮箱地址", example: "snailrun160@gmail.com" })
    public readonly email: string;
}
