import { Injectable } from "@nestjs/common";

/**
 * 邮件模板服务
 */
@Injectable()
export class MailTemplateService {
    /**
     * 生成验证码邮件模板
     *
     * @param code 验证码
     * @returns HTML格式的邮件内容
     */
    public getVerificationCodeTemplate(code: string): string {
        const currentYear = new Date().getFullYear();

        return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>邮箱验证码</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #2b65d9;
        }
        .content {
          padding: 20px 0;
        }
        .code-container {
          background-color: #f5f5f5;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
          text-align: center;
        }
        .code {
          font-size: 28px;
          font-weight: bold;
          letter-spacing: 6px;
          color: #2b65d9;
        }
        .instructions {
          color: #555;
          font-size: 14px;
          margin-top: 25px;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #999;
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #eee;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">SVG生成器</div>
        </div>
        <div class="content">
          <p>尊敬的用户：</p>
          <p>您好！感谢您使用SVG生成器。您正在进行邮箱验证，请使用以下验证码完成操作：</p>
          
          <div class="code-container">
            <div class="code">${code}</div>
          </div>
          
          <p>此验证码将在 <strong>30分钟</strong> 后过期。</p>
          
          <div class="instructions">
            <p>若您没有请求此验证码，请忽略此邮件。这可能是有人误输入了您的邮箱地址。</p>
            <p>请勿回复此邮件，此邮箱不接受回复邮件。</p>
          </div>
        </div>
        <div class="footer">
          <p>© ${currentYear} SVG生成器团队 | 保留所有权利</p>
        </div>
      </div>
    </body>
    </html>
    `;
    }

    /**
     * 获取文本格式的验证码内容
     *
     * @param code 验证码
     * @returns 纯文本格式的邮件内容
     */
    public getVerificationCodeText(code: string): string {
        return `
    SVG生成器 - 邮箱验证码
    
    尊敬的用户：
    
    您好！您正在进行SVG生成器的邮箱验证，您的验证码是：${code}
    
    此验证码将在30分钟后过期。
    
    若您没有请求此验证码，请忽略此邮件。
    请勿回复此邮件，此邮箱不接受回复邮件。
    
    © ${new Date().getFullYear()} SVG生成器团队
    `;
    }
}
