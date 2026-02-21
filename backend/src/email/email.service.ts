import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

type MailInfo = {
  messageId?: string;
};

type SendMailOptions = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

type Transporter = {
  sendMail: (options: SendMailOptions) => Promise<MailInfo>;
};

type NodemailerModule = {
  createTransport: (options: Record<string, unknown>) => Transporter;
};

const nm = nodemailer as unknown as NodemailerModule;

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? '587');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const secure =
      (this.config.get<string>('SMTP_SECURE') ?? 'false') === 'true';

    if (!host || !user || !pass) {
      // Allow local/dev to run without SMTP configured.

      console.warn(
        'SMTP is not configured. Password reset emails will be logged to console. Set SMTP_HOST, SMTP_USER, SMTP_PASS to enable real sending.',
      );

      this.transporter = nm.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });

      return this.transporter;
    }

    this.transporter = nm.createTransport({
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
    const from =
      this.config.get<string>('SMTP_FROM') ??
      this.config.get<string>('SMTP_USER') ??
      'no-reply@localhost';

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

    console.log('Password reset email queued:', {
      to: params.to,
      resetUrl: params.resetUrl,
      messageId: info.messageId ?? null,
    });
  }
}
