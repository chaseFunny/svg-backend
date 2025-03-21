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
     * @returns HTML 格式的邮件内容
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
          <div class="logo">SVG 生成器</div>
        </div>
        <div class="content">
          <p>尊敬的用户：</p>
          <p>您好！感谢您使用 SVG 生成器。您正在进行邮箱验证，请使用以下验证码完成操作：</p>
          
          <div class="code-container">
            <div class="code">${code}</div>
          </div>
          
          <p>此验证码将在 <strong>30 分钟</strong> 后过期。</p>
          
          <div class="instructions">
            <p>若您没有请求此验证码，请忽略此邮件。这可能是有人误输入了您的邮箱地址。</p>
            <p>请勿回复此邮件，此邮箱不接受回复邮件。</p>
          </div>
        </div>
        <div class="footer">
          <p>© ${currentYear} SVG 生成器团队 | 保留所有权利</p>
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
    SVG 生成器 - 邮箱验证码
    
    尊敬的用户：
    
    您好！您正在进行 SVG 生成器的邮箱验证，您的验证码是：${code}
    
    此验证码将在 30 分钟后过期。
    
    若您没有请求此验证码，请忽略此邮件。
    请勿回复此邮件，此邮箱不接受回复邮件。
    
    © ${new Date().getFullYear()} SVG 生成器团队
    `;
    }

    /**
     * 生成道歉邮件模板
     *
     * @returns HTML 格式的邮件内容
     */
    public getApologyTemplate(): string {
        const currentYear = new Date().getFullYear();

        return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>服务恢复通知</title>
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
        .highlight {
          background-color: #f5f5f5;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
          text-align: center;
          font-weight: bold;
          color: #2b65d9;
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
          <div class="logo">SVG 生成器</div>
        </div>
        <div class="content">
          <p>尊敬的用户：</p>
          <p>您好！非常抱歉地通知您，我们的 Claude 服务商之前出现了一些技术问题，这可能影响了您使用我们服务的体验。</p>
          
          <p>我们很高兴地告知您，<strong>目前所有服务已经完全恢复正常</strong>。</p>
          
          <div class="highlight">
            如需继续使用我们的服务，欢迎添加微信：RELEASE500，我们将免费赠送您 3 次使用机会作为补偿。
          </div>
          
          <p>感谢您的理解与支持，我们将继续努力提供更稳定、更优质的服务。</p>
        </div>
        <div class="footer">
          <p>© ${currentYear} SVG 生成器团队 | 保留所有权利</p>
        </div>
      </div>
    </body>
    </html>
    `;
    }

    /**
     * 获取文本格式的道歉邮件内容
     *
     * @returns 纯文本格式的邮件内容
     */
    public getApologyText(): string {
        return `
    SVG 生成器 - 服务恢复通知
    
    尊敬的用户：
    
    您好！非常抱歉地通知您，我们的 Claude 服务商之前出现了一些技术问题，这可能影响了您使用我们服务的体验。
    
    我们很高兴地告知您，目前所有服务已经完全恢复正常。
    
    如需继续使用我们的服务，欢迎添加微信，我们将免费赠送您 3 次使用机会作为补偿。
    
    感谢您的理解与支持，我们将继续努力提供更稳定、更优质的服务。
    
    © ${new Date().getFullYear()} SVG 生成器团队
    `;
    }
}
