import { Module } from '@nestjs/common';
import { SmsTemplateService } from './sms-template.service';
import { SmsTemplateController } from './sms-template.controller';

@Module({
    controllers: [SmsTemplateController],
    providers: [SmsTemplateService],
    exports: [SmsTemplateService],
})
export class SmsTemplateModule { }
