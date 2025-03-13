import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
    @ApiProperty({
        description: "邮箱地址或用户名",
        example: "snailrun160@gmail.com",
    })
    public readonly emailOrUsername: string;

    @ApiProperty({ description: "密码", example: "password123" })
    public readonly password: string;
}
