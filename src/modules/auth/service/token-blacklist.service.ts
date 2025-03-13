import { Injectable, Logger } from "@nestjs/common";
import * as jwt from "jsonwebtoken";

/**
 * Token黑名单服务
 * 用于管理已失效的JWT令牌
 */
@Injectable()
export class TokenBlacklistService {
    private readonly logger = new Logger(TokenBlacklistService.name);
    private readonly blacklist: Map<string, number> = new Map(); // token -> expiry timestamp

    /**
     * 初始化定时清理任务
     */
    public constructor() {
        // 每小时清理一次过期的黑名单token
        setInterval(() => this.cleanupExpiredTokens(), 60 * 60 * 1000);
    }

    /**
     * 将令牌加入黑名单
     *
     * @param token JWT令牌
     * @returns 是否成功加入黑名单
     */
    public addToBlacklist(token: string): boolean {
        try {
            // 解析令牌以获取过期时间
            const decoded = jwt.decode(token) as { exp?: number };

            if (!decoded || !decoded.exp) {
                this.logger.warn("无法解析令牌或令牌没有过期时间");
                return false;
            }

            // 存储令牌和过期时间
            this.blacklist.set(token, decoded.exp);
            this.logger.log(
                `令牌已加入黑名单，将在 ${new Date(
                    decoded.exp * 1000
                ).toISOString()} 过期`
            );
            return true;
        } catch (error) {
            this.logger.error("将令牌加入黑名单时出错", error);
            return false;
        }
    }

    /**
     * 检查令牌是否在黑名单中
     *
     * @param token JWT令牌
     * @returns 是否在黑名单中
     */
    public isBlacklisted(token: string): boolean {
        return this.blacklist.has(token);
    }

    /**
     * 清理过期的黑名单令牌
     *
     * @private
     */
    private cleanupExpiredTokens(): void {
        const now = Math.floor(Date.now() / 1000);
        let expiredCount = 0;

        for (const [token, expiry] of this.blacklist.entries()) {
            if (expiry < now) {
                this.blacklist.delete(token);
                expiredCount++;
            }
        }

        if (expiredCount > 0) {
            this.logger.log(`已清理 ${expiredCount} 个过期的黑名单令牌`);
        }
    }
}
