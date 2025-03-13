import { ApiProperty } from "@nestjs/swagger";

export class VerifyEmailDto {
    @ApiProperty({ description: "邮箱地址", example: "snailrun160@gmail.com" })
    public readonly email: string;

    @ApiProperty({ description: "验证码", example: "123456" })
    public readonly code: string;
}
