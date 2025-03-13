import { ApiProperty } from "@nestjs/swagger";
import { UserData } from "../../svg-generator/model";

export class AuthResponseDto {
    @ApiProperty({
        description: "认证令牌",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    })
    public readonly token: string;

    @ApiProperty({ description: "用户信息" })
    public readonly user: UserData;
}
