import { ApiProperty, PickType } from "@nestjs/swagger";
import { UserData } from "./user.data";

export class UserInput extends PickType(UserData, [
    "username",
    "email",
] as const) {
    @ApiProperty({
        description: "WeChat public account OpenID",
        required: false,
    })
    public readonly wechatOpenId?: string;

    @ApiProperty({ description: "WeChat mini-program OpenID", required: false })
    public readonly miniappOpenId?: string;
}
