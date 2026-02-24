import { Module } from '@nestjs/common';
import { CommerceRulesController } from './commerce-rules.controller';
import { CommerceRulesService } from './commerce-rules.service';

@Module({
  controllers: [CommerceRulesController],
  providers: [CommerceRulesService],
  exports: [CommerceRulesService],
})
export class CommerceRulesModule {}
