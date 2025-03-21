import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import * as nodemailer from "nodemailer";
import { ApplicationModule } from "../modules/app.module";
import { MailConfig } from "../modules/auth/model/mail-config";
import { MailTemplateService } from "../modules/auth/service/mail-template.service";

/**
 * 批量发送道歉邮件脚本
 */
async function bootstrap() {
    const logger = new Logger("SendApologyEmails");
    logger.log("开始发送道歉邮件...");

    try {
        // 创建 NestJS 应用程序实例
        const app = await NestFactory.createApplicationContext(
            ApplicationModule
        );

        // 获取邮件模板服务
        const mailTemplateService =
            app.get<MailTemplateService>(MailTemplateService);

        // 邮箱列表
        const emailList = [
            "snailrun160@gmail.com",
            "superzhou2007@126.com",
            // "soul1899@gmail.com",
            // "8462304@qq.com",
            // "byebye_415@163.com",
            // "sdjnzq@sina.com",
            // "freedly@gmail.com",
            // "yudalang@ucas.edu.cn",
            // "gpyquw@mailto.plus",
            // "937723369@qq.com",
            // "gcc1117@gmail.com",
            // "lyfxsxh@163.com",
            // "3706435@qq.com",
            // "25169133@qq.com",
            // "mikerchen@msn.com",
            // "244760145@qq.com",
            // "flycallme557@gmail.com",
        ];

        // 获取邮件模板
        const htmlContent = mailTemplateService.getApologyTemplate();
        const textContent = mailTemplateService.getApologyText();

        // 直接创建一个新的 MailConfig 实例
        const mailConfig = new MailConfig();

        // 批量发送邮件
        let successCount = 0;
        let failCount = 0;

        // 创建一个新的 transporter
        const transporter = nodemailer.createTransport({
            host: mailConfig.host,
            port: mailConfig.port,
            secure: mailConfig.secure,
            auth: {
                user: mailConfig.user,
                pass: mailConfig.pass,
            },
        });

        for (const email of emailList) {
            try {
                // 准备邮件内容
                const mailOptions = {
                    from: `"${mailConfig.senderName}" <${mailConfig.user}>`,
                    to: email,
                    subject: "服务恢复通知 - SVG 生成器",
                    text: textContent,
                    html: htmlContent,
                };

                // 发送邮件
                await transporter.sendMail(mailOptions);
                logger.log(`成功发送邮件到：${email}`);
                successCount++;

                // 添加延迟避免邮件服务器限制
                await new Promise((resolve) => setTimeout(resolve, 6000));
            } catch (error) {
                logger.error(
                    `发送邮件到 ${email} 失败:`,
                    error instanceof Error ? error.message : String(error)
                );
                failCount++;
            }
        }

        logger.log(`邮件发送完成。成功：${successCount}, 失败：${failCount}`);
        await app.close();
    } catch (error) {
        logger.error(
            "批量发送邮件失败：",
            error instanceof Error ? error.message : String(error)
        );
    }
}

// 执行脚本
bootstrap()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(
            "执行过程中发生错误：",
            error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
    });
