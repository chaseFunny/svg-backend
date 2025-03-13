import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";

import { FastifyRequest } from "fastify";
import { LoggerService } from "../../common";
import { UserData } from "../../svg-generator/model";
import { Public } from "../decorator/public.decorator";
import {
    LoginPipe,
    RegisterPipe,
    SendVerificationCodePipe,
    VerifyEmailPipe,
} from "../flow";
import {
    AuthResponseDto,
    LoginDto,
    RegisterDto,
    SendVerificationCodeDto,
    VerifyEmailDto,
} from "../model";
import { AuthService, JwtGuard } from "../service";

interface RequestWithUser extends FastifyRequest {
    user: UserData;
    token?: string;
}

@Controller("auth")
@ApiTags("认证")
export class AuthController {
    public constructor(
        private readonly logger: LoggerService,
        private readonly authService: AuthService
    ) {}

    @Public()
    @Post("register")
    @ApiOperation({ summary: "用户注册" })
    @ApiResponse({ status: HttpStatus.CREATED, type: AuthResponseDto })
    public async register(
        @Body(RegisterPipe) registerDto: RegisterDto
    ): Promise<AuthResponseDto> {
        this.logger.info(
            `用户注册: ${registerDto.username} (${registerDto.email})`
        );
        return this.authService.register(registerDto);
    }

    @Public()
    @Post("login")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "用户登录" })
    @ApiResponse({ status: HttpStatus.OK, type: AuthResponseDto })
    public async login(
        @Body(LoginPipe) loginDto: LoginDto
    ): Promise<AuthResponseDto> {
        this.logger.info(`用户登录尝试: ${loginDto.emailOrUsername}`);
        return this.authService.login(loginDto);
    }

    @Post("logout")
    @UseGuards(JwtGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "用户退出登录" })
    @ApiResponse({
        status: HttpStatus.OK,
        schema: {
            type: "object",
            properties: {
                success: { type: "boolean" },
                message: { type: "string" },
            },
        },
    })
    public logout(@Req() request: RequestWithUser): {
        success: boolean;
        message: string;
    } {
        this.logger.info(`用户登出: ${request.user.id}`);

        if (!request.token) {
            return {
                success: false,
                message: "无法获取认证令牌",
            };
        }

        return this.authService.logout(request.token);
    }

    @Get("me")
    @UseGuards(JwtGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "获取当前登录用户信息" })
    @ApiResponse({ status: HttpStatus.OK, type: UserData })
    public getCurrentUser(@Req() request: RequestWithUser): UserData {
        this.logger.info(`获取用户信息: ${request.user.id}`);
        return request.user;
    }

    @Public()
    @Post("verification-code")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "发送邮箱验证码" })
    @ApiResponse({ status: HttpStatus.OK, type: Boolean })
    public async sendVerificationCode(
        @Body(SendVerificationCodePipe) dto: SendVerificationCodeDto
    ): Promise<boolean> {
        this.logger.info(`发送验证码到邮箱: ${dto.email}`);
        return this.authService.sendVerificationCode(dto.email);
    }

    @Public()
    @Post("verify-email")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "验证邮箱验证码" })
    @ApiResponse({ status: HttpStatus.OK, type: Boolean })
    public async verifyEmail(
        @Body(VerifyEmailPipe) dto: VerifyEmailDto
    ): Promise<boolean> {
        this.logger.info(`验证邮箱: ${dto.email}`);
        return this.authService.verifyEmailCode(dto.email, dto.code);
    }
}
