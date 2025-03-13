/**
 * 邮件发送配置
 */
export class MailConfig {
    /** SMTP服务器主机 */
    public readonly host: string;

    /** SMTP服务器端口 */
    public readonly port: number;

    /** 是否使用SSL */
    public readonly secure: boolean;

    /** 用户名/邮箱地址 */
    public readonly user: string;

    /** 密码或授权码 */
    public readonly pass: string;

    /** 发件人名称 */
    public readonly senderName: string;

    public constructor() {
        this.host = process.env.MAIL_HOST || "smtp.qq.com";
        this.port = parseInt(process.env.MAIL_PORT || "465", 10);
        this.secure = process.env.MAIL_SECURE !== "false";
        this.user = process.env.MAIL_USER || "3074994545@qq.com";
        this.pass = process.env.MAIL_PASS || "";
        this.senderName = process.env.MAIL_SENDER_NAME || "SVG秀";
    }
}
