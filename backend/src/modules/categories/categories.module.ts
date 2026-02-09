import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { PublicCategoriesController } from './public-categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  controllers: [CategoriesController, PublicCategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
