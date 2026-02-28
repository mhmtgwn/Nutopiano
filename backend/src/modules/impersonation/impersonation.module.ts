import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ImpersonationService } from './impersonation.service';
import { ImpersonationController } from './impersonation.controller';

@Module({
    imports: [JwtModule.register({})],
    controllers: [ImpersonationController],
    providers: [ImpersonationService],
    exports: [ImpersonationService],
})
export class ImpersonationModule { }
