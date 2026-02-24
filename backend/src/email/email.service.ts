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

  private async sendEmail(params: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    const from =
      this.config.get<string>('SMTP_FROM') ??
      this.config.get<string>('SMTP_USER') ??
      'no-reply@localhost';

    const transporter = this.getTransporter();

    const info = await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    console.log('Email queued:', {
      to: params.to,
      subject: params.subject,
      messageId: info.messageId ?? null,
    });
  }

  async sendPasswordResetEmail(params: {
    to: string;
    resetUrl: string;
    siteName: string;
  }): Promise<void> {
    await this.sendEmail({
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
  }

  async sendSellerTeamInviteEmail(params: {
    to: string;
    sellerName: string;
    inviteUrl: string;
    expiresAt: Date;
    targetName?: string;
  }): Promise<void> {
    const expireText = params.expiresAt.toISOString();
    await this.sendEmail({
      to: params.to,
      subject: `${params.sellerName} | Seller Team Daveti`,
      text: `Merhaba ${params.targetName ?? ''}, ${params.sellerName} seller ekibine davet edildiniz. Daveti kabul etmek icin: ${params.inviteUrl}. Son gecerlilik: ${expireText}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2 style="margin:0 0 12px">Seller Team Daveti</h2>
          <p>Merhaba ${params.targetName ?? ''},</p>
          <p><strong>${params.sellerName}</strong> seller ekibine davet edildiniz.</p>
          <p>Davet baglantisi: <a href="${params.inviteUrl}">${params.inviteUrl}</a></p>
          <p style="color:#666;font-size:12px">Son gecerlilik: ${expireText}</p>
        </div>
      `,
    });
  }

  async sendOrderCreatedEmail(params: {
    to: string;
    customerName: string;
    orderId: number;
    totalAmountCents: number;
    siteName: string;
  }): Promise<void> {
    const total = (params.totalAmountCents / 100).toFixed(2);

    await this.sendEmail({
      to: params.to,
      subject: `${params.siteName} | Siparis Alindi #${params.orderId}`,
      text: `Merhaba ${params.customerName}, #${params.orderId} numarali siparisiniz alindi. Toplam: ${total} TRY.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2 style="margin:0 0 12px">Siparisiniz Alindi</h2>
          <p>Merhaba ${params.customerName},</p>
          <p><strong>#${params.orderId}</strong> numarali siparisiniz basariyla olusturuldu.</p>
          <p>Toplam tutar: <strong>${total} TRY</strong></p>
        </div>
      `,
    });
  }

  async sendOrderStatusChangedEmail(params: {
    to: string;
    customerName: string;
    orderId: number;
    previousStatusKey: string;
    nextStatusKey: string;
    siteName: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: `${params.siteName} | Siparis Durumu Guncellendi #${params.orderId}`,
      text: `Merhaba ${params.customerName}, #${params.orderId} numarali siparisinizin durumu ${params.previousStatusKey} -> ${params.nextStatusKey} olarak guncellendi.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2 style="margin:0 0 12px">Siparis Durumu Guncellendi</h2>
          <p>Merhaba ${params.customerName},</p>
          <p><strong>#${params.orderId}</strong> numarali siparisinizin durumu guncellendi.</p>
          <p>
            <strong>${params.previousStatusKey}</strong>
            &rarr;
            <strong>${params.nextStatusKey}</strong>
          </p>
        </div>
      `,
    });
  }

  async sendOrderPaymentReceivedEmail(params: {
    to: string;
    customerName: string;
    orderId: number;
    amountCents: number;
    method: string;
    siteName: string;
  }): Promise<void> {
    const amount = (params.amountCents / 100).toFixed(2);

    await this.sendEmail({
      to: params.to,
      subject: `${params.siteName} | Odeme Alindi #${params.orderId}`,
      text: `Merhaba ${params.customerName}, #${params.orderId} siparisiniz icin ${amount} TRY odeme alindi. Yontem: ${params.method}.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2 style="margin:0 0 12px">Odeme Alindi</h2>
          <p>Merhaba ${params.customerName},</p>
          <p><strong>#${params.orderId}</strong> numarali siparisiniz icin odeme alindi.</p>
          <p>Tutar: <strong>${amount} TRY</strong></p>
          <p>Yontem: <strong>${params.method}</strong></p>
        </div>
      `,
    });
  }
}
