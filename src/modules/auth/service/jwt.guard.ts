import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { FastifyRequest } from "fastify";
import { UserData } from "../../svg-generator/model";
import { IS_PUBLIC_KEY } from "../decorator/public.decorator";
import { JwtStrategy } from "./jwt.strategy";
import { TokenBlacklistService } from "./token-blacklist.service";

interface RequestWithUser extends FastifyRequest {
    user: UserData;
    token?: string;
}

@Injectable()
export class JwtGuard implements CanActivate {
    public constructor(
        private readonly jwtStrategy: JwtStrategy,
        private readonly tokenBlacklistService: TokenBlacklistService,
        private readonly reflector: Reflector
    ) {}

    /**
     * 验证请求是否包含有效的JWT令牌
     *
     * @param context 执行上下文
     * @returns 是否通过验证
     */
    public async canActivate(context: ExecutionContext): Promise<boolean> {
        // 检查是否为公开API，若是则跳过验证
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [context.getHandler(), context.getClass()]
        );

        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest<RequestWithUser>();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException("缺少认证令牌");
        }

        // 检查令牌是否在黑名单中
        if (this.tokenBlacklistService.isBlacklisted(token)) {
            throw new UnauthorizedException("令牌已失效，请重新登录");
        }

        try {
            // 验证令牌并获取用户信息
            const user = await this.jwtStrategy.validate(token);
            // 将用户信息添加到请求对象
            request.user = user;
            // 将原始token附加到请求对象，以便可能的注销操作
            request.token = token;
            return true;
        } catch (error) {
            throw new UnauthorizedException("无效的认证令牌");
        }
    }

    /**
     * 从请求头中提取JWT令牌
     *
     * @param request 请求对象
     * @returns JWT令牌
     */
    private extractTokenFromHeader(
        request: FastifyRequest
    ): string | undefined {
        const authHeader = request.headers.authorization;
        if (!authHeader || typeof authHeader !== "string") {
            return undefined;
        }

        const [type, token] = authHeader.split(" ");
        return type === "Bearer" ? token : undefined;
    }
}
