import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { PrismaService } from "../../common";
import { UserData } from "../../svg-generator/model";

interface CustomJwtPayload {
    sub: number;
    iat?: number;
    exp?: number;
}

@Injectable()
export class JwtStrategy {
    private readonly JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

    public constructor(private readonly prismaService: PrismaService) {}

    /**
     * 验证JWT令牌并返回用户信息
     *
     * @param token JWT令牌
     * @returns 用户信息
     */
    public async validate(token: string): Promise<UserData> {
        try {
            // 验证令牌
            const decoded = jwt.verify(token, this.JWT_SECRET);
            // 安全地进行类型转换
            const payload = decoded as unknown as CustomJwtPayload;
            const userId = payload.sub;

            // 查找用户
            const user = await this.prismaService.user.findUnique({
                where: { id: userId },
            });

            if (!user || !user.isActive || user.isDeleted) {
                throw new UnauthorizedException("无效的用户");
            }

            return new UserData(user);
        } catch (error) {
            throw new UnauthorizedException("无效的令牌");
        }
    }
}
