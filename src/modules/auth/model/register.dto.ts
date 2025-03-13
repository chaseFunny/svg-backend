import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
    @ApiProperty({ description: "用户名", example: "luckySnail" })
    public readonly username: string;

    @ApiProperty({ description: "邮箱地址", example: "snailrun160@gmail.com" })
    public readonly email: string;

    @ApiProperty({ description: "密码", example: "password123" })
    public readonly password: string;

    @ApiProperty({ description: "邮箱验证码", example: "123456" })
    public readonly verificationCode: string;

    @ApiProperty({
        description: "邀请码（邀请人ID）",
        example: "1",
        required: false,
    })
    public readonly inviteCode?: string;
}
