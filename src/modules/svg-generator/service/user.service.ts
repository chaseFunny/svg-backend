import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../../common";
import { UserData, UserInput } from "../model";
@Injectable()
export class UserService {
    public constructor(private readonly prismaService: PrismaService) {}

    /**
     * Find all users in the database
     *
     * @returns A user list
     */
    public async findAll(): Promise<UserData[]> {
        const users = await this.prismaService.user.findMany({});
        return users.map((user) => new UserData(user));
    }

    /**
     * Find a user by ID
     *
     * @param id User ID
     * @returns The user if found
     */
    public async findById(id: number): Promise<UserData | null> {
        const user = await this.prismaService.user.findUnique({
            where: { id },
        });
        return user ? new UserData(user) : null;
    }

    /**
     * Create a new user record
     *
     * @param data User details
     * @returns A user created in the database
     */
    public async create(data: UserInput): Promise<UserData> {
        const user = await this.prismaService.user.create({
            data: {
                username: data.username ?? uuidv4().slice(0, 10),
                email: data.email,
                wechatOpenId: data.wechatOpenId,
                miniappOpenId: data.miniappOpenId,
                role: "USER",
                remainingCredits: 2,
                isInvited: false,
            },
        });

        return new UserData(user);
    }
}
