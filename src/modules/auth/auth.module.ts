import { Module } from "@nestjs/common";
import { Service } from "../../tokens";
import { CommonModule } from "../common";
import { AuthController } from "./controller";
import { AuthService, JwtGuard, JwtStrategy, MailService } from "./service";
import { MailTemplateService } from "./service/mail-template.service";
import { TokenBlacklistService } from "./service/token-blacklist.service";

@Module({
    imports: [CommonModule],
    controllers: [AuthController],
    providers: [
        AuthService,
        MailService,
        MailTemplateService,
        JwtStrategy,
        JwtGuard,
        TokenBlacklistService,
        {
            provide: Service.CONFIG,
            useValue: {
                /* 配置值 */
            }, // 或者useFactory/useClass
        },
    ],
    exports: [AuthService, JwtGuard],
})
export class AuthModule {}
