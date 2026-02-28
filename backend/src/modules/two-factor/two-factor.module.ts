import { Module } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorController, AdminTwoFactorController } from './two-factor.controller';

@Module({
    controllers: [TwoFactorController, AdminTwoFactorController],
    providers: [TwoFactorService],
    exports: [TwoFactorService],
})
export class TwoFactorModule { }
