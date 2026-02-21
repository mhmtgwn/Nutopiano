import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DevController } from './dev/dev.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { FinanceModule } from './modules/finance/finance.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { OrderStatusModule } from './modules/order-status/order-status.module';
import { SettingsModule } from './modules/settings/settings.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { PlansModule } from './modules/plans/plans.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DatabaseModule } from './database/database.module';
import { EmailModule } from './email/email.module';
import { HealthModule } from './modules/health/health.module';
import { RedisThrottlerStorage } from './common/throttler/redis-throttler.storage';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const throttlers = [
          {
            name: 'default',
            ttl: 60_000,
            limit: 60,
          },
          {
            name: 'auth',
            ttl: 15 * 60_000,
            limit: 5,
          },
        ];

        const redisUrl = process.env.REDIS_URL?.trim();
        return {
          throttlers,
          storage: redisUrl
            ? new RedisThrottlerStorage(redisUrl)
            : new RedisThrottlerStorage(),
        };
      },
    }),
    DatabaseModule,
    EmailModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    CategoriesModule,
    ProductsModule,
    MarketplaceModule,
    FinanceModule,
    SellersModule,
    OrderStatusModule,
    SettingsModule,
    OrdersModule,
    AppointmentsModule,
    UploadsModule,
    PlansModule,
    DashboardModule,
    PaymentsModule,
  ],

  controllers: [AppController, DevController],
  providers: [AppService],
})
export class AppModule {}
