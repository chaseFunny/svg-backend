import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { MailConfig } from "../model";
import { MailTemplateService } from "./mail-template.service";

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly transporter: nodemailer.Transporter;
    private readonly mailConfig: MailConfig;

    /**
     * 初始化邮件服务
     */
    public constructor(
        private readonly mailTemplateService: MailTemplateService
    ) {
        // 初始化邮件配置
        this.mailConfig = new MailConfig();

        // 创建Nodemailer传输器
        this.transporter = nodemailer.createTransport({
            host: this.mailConfig.host,
            port: this.mailConfig.port,
            secure: this.mailConfig.secure,
            auth: {
                user: this.mailConfig.user,
                pass: this.mailConfig.pass,
            },
        });

        // 启动时验证SMTP配置
        void this.verifyConnection();
    }

    /**
     * 生成随机的6位数验证码
     *
     * @returns 6位数验证码
     */
    public generateVerificationCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * 发送验证码邮件
     *
     * @param email 收件人邮箱
     * @param code 验证码
     * @returns 是否发送成功
     */
    public async sendVerificationEmail(
        email: string,
        code: string
    ): Promise<boolean> {
        try {
            // 获取邮件模板
            const htmlContent =
                this.mailTemplateService.getVerificationCodeTemplate(code);
            const textContent =
                this.mailTemplateService.getVerificationCodeText(code);

            // 准备邮件内容
            const mailOptions = {
                from: `"${this.mailConfig.senderName}" <${this.mailConfig.user}>`,
                to: email,
                subject: "您的验证码 - SVG生成器",
                text: textContent,
                html: htmlContent,
            };

            // 尝试发送邮件
            try {
                await this.transporter.sendMail(mailOptions);
                this.logger.log(`成功发送验证码到邮箱: ${email}`);
                return true;
            } catch (error: unknown) {
                const errorMessage =
                    error instanceof Error ? error.message : "未知错误";
                this.logger.error(`使用SMTP发送邮件失败: ${errorMessage}`);

                // 如果SMTP发送失败，使用控制台模拟发送（开发/测试环境）
                if (process.env.NODE_ENV !== "production") {
                    this.logger.log(
                        `[模拟发送] 发送验证码 ${code} 到邮箱 ${email}`
                    );
                    return true;
                }
                return false;
            }
        } catch (error: unknown) {
            this.logger.error("发送邮件失败:", error);
            return false;
        }
    }
    /**
     * 验证SMTP连接配置
     *
     * @private
     */
    private async verifyConnection(): Promise<void> {
        try {
            await this.transporter.verify();
            this.logger.log("SMTP服务器连接成功");
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : "未知错误";
            this.logger.warn(`SMTP服务器连接失败: ${errorMessage}`);
            this.logger.warn("邮件功能将使用控制台模拟发送");
        }
    }
}
