import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? '587');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const secure = (this.config.get<string>('SMTP_SECURE') ?? 'false') === 'true';

    if (!host || !user || !pass) {
      // Allow local/dev to run without SMTP configured.
      // eslint-disable-next-line no-console
      console.warn(
        'SMTP is not configured. Password reset emails will be logged to console. Set SMTP_HOST, SMTP_USER, SMTP_PASS to enable real sending.',
      );

      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });

      return this.transporter;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    return this.transporter;
  }

  async sendPasswordResetEmail(params: {
    to: string;
    resetUrl: string;
    siteName: string;
  }): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM') ?? this.config.get<string>('SMTP_USER') ?? 'no-reply@localhost';

    const transporter = this.getTransporter();

    const info = await transporter.sendMail({
      from,
      to: params.to,
      subject: `${params.siteName} | Şifre Sıfırlama`,
      text: `Şifrenizi sıfırlamak için linke tıklayın: ${params.resetUrl}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2 style="margin:0 0 12px">Şifre Sıfırlama</h2>
          <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıyı kullanın:</p>
          <p><a href="${params.resetUrl}">${params.resetUrl}</a></p>
          <p style="color:#666;font-size:12px">Bu linkin süresi sınırlıdır. Eğer bu isteği siz yapmadıysanız bu maili yok sayabilirsiniz.</p>
        </div>
      `,
    });

    // eslint-disable-next-line no-console
    console.log('Password reset email queued:', {
      to: params.to,
      resetUrl: params.resetUrl,
      messageId: info.messageId,
    });
  }
}
