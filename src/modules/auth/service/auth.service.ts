import {
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../../common";
import { UserData } from "../../svg-generator/model";
import { AuthResponseDto, LoginDto, RegisterDto } from "../model";
import { MailService } from "./mail.service";
import { TokenBlacklistService } from "./token-blacklist.service";

@Injectable()
export class AuthService {
    private readonly JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
    private readonly SALT_ROUNDS = 10;

    public constructor(
        private readonly prismaService: PrismaService,
        private readonly mailService: MailService,
        private readonly tokenBlacklistService: TokenBlacklistService
    ) {}

    /**
     * 发送邮箱验证码
     *
     * @param email 邮箱地址
     * @returns 是否发送成功
     */
    public async sendVerificationCode(email: string): Promise<boolean> {
        // 检查邮箱是否已被注册
        const existingUser = await this.prismaService.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictException("邮箱已被注册");
        }

        const code = this.mailService.generateVerificationCode();

        // 存储验证码到数据库
        await this.prismaService.emailVerification.create({
            data: {
                email,
                code,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30分钟有效期
            },
        });

        // 发送验证码到邮箱
        return this.mailService.sendVerificationEmail(email, code);
    }

    /**
     * 验证邮箱验证码
     *
     * @param email 邮箱地址
     * @param code 验证码
     * @returns 是否验证成功
     */
    public async verifyEmailCode(
        email: string,
        code: string
    ): Promise<boolean> {
        const verification =
            (await this.prismaService.emailVerification.findFirst({
                where: {
                    email,
                    code,
                    isUsed: false,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
            })) as {
                email: string;
                code: string;
                isUsed: boolean;
                expiresAt: Date;
            } | null;

        if (!verification) {
            return false;
        }

        return true;
    }

    /**
     * 注册新用户
     *
     * @param registerDto 注册信息
     * @returns 注册结果，包含用户信息和token
     */
    public async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
        const { username, email, password, verificationCode, inviteCode } =
            registerDto;

        // 验证邮箱和验证码
        const isValidCode = await this.verifyEmailCode(email, verificationCode);
        if (!isValidCode) {
            throw new UnauthorizedException("验证码无效或已过期");
        }

        // 检查用户名是否已被使用
        const existingUsername = await this.prismaService.user.findFirst({
            where: { username },
        });
        if (existingUsername) {
            throw new ConflictException("用户名已被使用");
        }

        // 验证邀请码
        let inviterId: number | null = null;
        let isInvited = false;
        console.log(inviteCode, "inviteCode");

        if (inviteCode) {
            inviterId = parseInt(inviteCode, 10);
            if (isNaN(inviterId)) {
                throw new UnauthorizedException("无效的邀请码格式");
            }

            // 查找邀请人
            const inviter = await this.prismaService.user.findUnique({
                where: { id: inviterId },
            });

            if (!inviter) {
                throw new NotFoundException("邀请人不存在");
            }

            isInvited = true;
        }

        // 密码加密
        const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

        // 创建用户
        const user = await this.prismaService.user.create({
            data: {
                username: username ?? uuidv4().slice(0, 10),
                email,
                password: hashedPassword,
                role: "USER",
                remainingCredits: 2,
                isInvited,
                invitedBy: inviterId,
            },
        });

        // 如果是通过邀请注册的，更新邀请人的积分
        if (isInvited && inviterId) {
            await this.prismaService.user.update({
                where: { id: inviterId },
                data: {
                    remainingCredits: {
                        increment: 2, // 给邀请人增加2点积分
                    },
                },
            });
        }

        // 将验证码标记为已使用
        await this.prismaService.emailVerification.updateMany({
            where: { email, code: verificationCode },
            data: { isUsed: true },
        });

        // 生成JWT token
        const token = this.generateToken(user.id);

        return {
            user: new UserData(user),
            token,
        };
    }

    /**
     * 用户登录
     *
     * @param loginDto 登录信息
     * @returns 登录结果，包含用户信息和token
     */
    public async login(loginDto: LoginDto): Promise<AuthResponseDto> {
        const { emailOrUsername, password } = loginDto;
        // 查找用户
        const user = await this.prismaService.user.findFirst({
            where: {
                OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
            },
        });

        if (!user) {
            throw new NotFoundException("用户不存在");
        }

        // 验证密码
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password ?? ""
        );
        if (!isPasswordValid) {
            throw new UnauthorizedException("密码错误");
        }

        // 更新最后登录时间
        await this.prismaService.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        // 生成JWT token
        const token = this.generateToken(user.id);

        return {
            user: new UserData(user),
            token,
        };
    }

    /**
     * 用户登出
     *
     * @param token JWT令牌
     * @returns 是否成功登出
     */
    public logout(token: string): { success: boolean; message: string } {
        // 将token加入黑名单
        const success = this.tokenBlacklistService.addToBlacklist(token);

        if (success) {
            return {
                success: true,
                message: "已成功登出",
            };
        }

        return {
            success: false,
            message: "登出失败，无法使令牌失效",
        };
    }

    /**
     * 生成JWT令牌
     *
     * @param userId 用户ID
     * @returns JWT令牌
     */
    private generateToken(userId: number): string {
        const payload = { sub: userId };
        return jwt.sign(payload, this.JWT_SECRET, { expiresIn: "30d" });
    }
}
