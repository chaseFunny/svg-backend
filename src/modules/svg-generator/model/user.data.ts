import { ApiProperty } from "@nestjs/swagger";
import { User } from "@prisma/client";

export class UserData {
    public static readonly USERNAME_LENGTH = 50;

    @ApiProperty({ description: "User unique ID", example: "1" })
    public readonly id: number;

    @ApiProperty({ description: "Username", example: "luckySnail" })
    public readonly username: string;

    @ApiProperty({
        description: "Email address",
        example: "snailrun160@gmail.com",
        required: false,
    })
    public readonly email?: string;

    @ApiProperty({
        description: "User role",
        example: "USER",
        enum: ["ADMIN", "USER"],
    })
    public readonly role: string;

    @ApiProperty({ description: "Remaining generation credits", example: 5 })
    public readonly remainingCredits: number;

    @ApiProperty({ description: "Whether user was invited", example: false })
    public readonly isInvited: boolean;

    public constructor(entity: User) {
        this.id = entity.id;
        this.username = entity.username;
        this.email = entity.email || undefined;
        this.role = entity.role;
        this.remainingCredits = entity.remainingCredits;
        this.isInvited = entity.isInvited;
    }
}
