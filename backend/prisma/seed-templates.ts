import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMAIL_TEMPLATES = [
    { key: 'welcome', name: 'Hoş Geldiniz', subject: 'Nutopiano\'ya Hoş Geldiniz!', bodyHtml: '<h2>Hoş Geldiniz!</h2><p>{{customerName}}, platformumuza kayıt olduğunuz için teşekkür ederiz.</p>', variables: ['customerName'] },
    { key: 'order_created', name: 'Sipariş Oluşturuldu', subject: 'Siparişiniz Alındı #{{orderId}}', bodyHtml: '<h2>Sipariş Onayı</h2><p>Merhaba {{customerName}},</p><p>#{{orderId}} numaralı siparişiniz başarıyla oluşturuldu.</p><p>Toplam: <strong>{{totalAmount}} TRY</strong></p>', variables: ['customerName', 'orderId', 'totalAmount'] },
    { key: 'order_shipped', name: 'Sipariş Kargoya Verildi', subject: 'Siparişiniz Kargoya Verildi #{{orderId}}', bodyHtml: '<h2>Kargoya Verildi</h2><p>Merhaba {{customerName}},</p><p>#{{orderId}} numaralı siparişiniz kargoya verildi.</p><p>Kargo takip no: <strong>{{trackingNumber}}</strong></p>', variables: ['customerName', 'orderId', 'trackingNumber'] },
    { key: 'order_delivered', name: 'Sipariş Teslim Edildi', subject: 'Siparişiniz Teslim Edildi #{{orderId}}', bodyHtml: '<h2>Teslim Edildi</h2><p>Merhaba {{customerName}},</p><p>#{{orderId}} numaralı siparişiniz teslim edilmiştir.</p>', variables: ['customerName', 'orderId'] },
    { key: 'password_reset', name: 'Şifre Sıfırlama', subject: 'Şifre Sıfırlama Talebi', bodyHtml: '<h2>Şifre Sıfırlama</h2><p>Şifrenizi sıfırlamak için aşağıdaki bağlantıyı kullanın:</p><p><a href="{{resetUrl}}">Şifremi Sıfırla</a></p><p style="color:#666;font-size:12px">Bu link {{expiresIn}} dakika geçerlidir.</p>', variables: ['resetUrl', 'expiresIn'] },
    { key: 'payment_received', name: 'Ödeme Alındı', subject: 'Ödeme Alındı #{{orderId}}', bodyHtml: '<h2>Ödeme Alındı</h2><p>Merhaba {{customerName}},</p><p>#{{orderId}} siparişiniz için {{amount}} TRY ödeme alındı.</p><p>Yöntem: <strong>{{paymentMethod}}</strong></p>', variables: ['customerName', 'orderId', 'amount', 'paymentMethod'] },
    { key: 'refund_approved', name: 'İade Onaylandı', subject: 'İade Talebiniz Onaylandı #{{orderId}}', bodyHtml: '<h2>İade Onayı</h2><p>Merhaba {{customerName}},</p><p>#{{orderId}} siparişiniz için {{refundAmount}} TRY iade onaylanmıştır.</p>', variables: ['customerName', 'orderId', 'refundAmount'] },
    { key: 'seller_invite', name: 'Satıcı Ekip Daveti', subject: '{{sellerName}} Ekibine Davet', bodyHtml: '<h2>Ekip Daveti</h2><p>Merhaba {{targetName}},</p><p><strong>{{sellerName}}</strong> satıcı ekibine davet edildiniz.</p><p><a href="{{inviteUrl}}">Daveti Kabul Et</a></p><p style="color:#666;font-size:12px">Son geçerlilik: {{expiresAt}}</p>', variables: ['targetName', 'sellerName', 'inviteUrl', 'expiresAt'] },
    { key: 'account_verification', name: 'Hesap Doğrulama', subject: 'Hesabınızı Doğrulayın', bodyHtml: '<h2>Hesap Doğrulama</h2><p>Merhaba {{customerName}},</p><p>Hesabınızı doğrulamak için aşağıdaki kodu kullanın:</p><p style="font-size:24px;font-weight:bold">{{verificationCode}}</p>', variables: ['customerName', 'verificationCode'] },
];

const SMS_TEMPLATES = [
    { key: 'otp_login', name: 'Giriş OTP', bodyText: 'Nutopiano giriş kodunuz: {{code}}. 5 dakika geçerlidir.', variables: ['code'] },
    { key: 'order_created', name: 'Sipariş Onayı SMS', bodyText: '#{{orderId}} numaralı siparişiniz alındı. Toplam: {{totalAmount}} TRY', variables: ['orderId', 'totalAmount'] },
    { key: 'order_shipped', name: 'Kargo SMS', bodyText: '#{{orderId}} siparişiniz kargoya verildi. Takip: {{trackingNumber}}', variables: ['orderId', 'trackingNumber'] },
    { key: 'order_delivered', name: 'Teslim SMS', bodyText: '#{{orderId}} siparişiniz teslim edildi.', variables: ['orderId'] },
    { key: 'password_reset', name: 'Şifre Sıfırlama SMS', bodyText: 'Şifre sıfırlama kodunuz: {{code}}. 10 dakika geçerlidir.', variables: ['code'] },
    { key: 'payment_received', name: 'Ödeme SMS', bodyText: '#{{orderId}} için {{amount}} TRY ödeme alındı.', variables: ['orderId', 'amount'] },
    { key: 'seller_invite', name: 'Satıcı Davet SMS', bodyText: '{{sellerName}} ekibine davet edildiniz. {{inviteUrl}}', variables: ['sellerName', 'inviteUrl'] },
    { key: '2fa_code', name: '2FA SMS', bodyText: 'İki faktörlü doğrulama kodunuz: {{code}}', variables: ['code'] },
    { key: 'appointment_reminder', name: 'Randevu Hatırlatma SMS', bodyText: '{{serviceName}} randevunuz {{dateTime}} tarihinde. İptal: {{cancelUrl}}', variables: ['serviceName', 'dateTime', 'cancelUrl'] },
];

export async function seedTemplates(businessId: number) {
    console.log(`Seeding email templates for businessId=${businessId}...`);
    for (const tpl of EMAIL_TEMPLATES) {
        const existing = await prisma.emailTemplate.findFirst({
            where: { businessId, key: tpl.key },
        });
        if (!existing) {
            await prisma.emailTemplate.create({
                data: {
                    businessId,
                    key: tpl.key,
                    name: tpl.name,
                    subject: tpl.subject,
                    bodyHtml: tpl.bodyHtml,
                    variables: tpl.variables,
                },
            });
            console.log(`  ✅ Email: ${tpl.key}`);
        } else {
            console.log(`  ⏭️ Email: ${tpl.key} (exists)`);
        }
    }

    console.log(`Seeding SMS templates for businessId=${businessId}...`);
    for (const tpl of SMS_TEMPLATES) {
        const existing = await prisma.smsTemplate.findFirst({
            where: { businessId, key: tpl.key },
        });
        if (!existing) {
            await prisma.smsTemplate.create({
                data: {
                    businessId,
                    key: tpl.key,
                    name: tpl.name,
                    bodyText: tpl.bodyText,
                    variables: tpl.variables,
                },
            });
            console.log(`  ✅ SMS: ${tpl.key}`);
        } else {
            console.log(`  ⏭️ SMS: ${tpl.key} (exists)`);
        }
    }

    console.log('Template seeding complete.');
}

// Run only when executed directly
if (require.main === module) {
    const businessId = Number(process.env.SEED_BUSINESS_ID ?? 1);
    seedTemplates(businessId)
        .then(() => prisma.$disconnect())
        .catch((e) => {
            console.error(e);
            prisma.$disconnect();
            process.exit(1);
        });
}
