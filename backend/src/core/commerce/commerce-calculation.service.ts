import { Injectable } from '@nestjs/common';
import {
  CalculationRequestContext,
  CalculationResult,
  CalculationVersionSeed,
} from './contracts';
import { CalculationEngine } from './engine';
import {
  CommissionStep,
  DeliveryStep,
  DiscountStep,
  FinalizeStep,
  PricingStep,
  RoundingStep,
  TaxStep,
} from './engine/steps';

@Injectable()
export class CommerceCalculationService {
  private readonly engine = new CalculationEngine([
    new PricingStep(),
    new DiscountStep(),
    new TaxStep(),
    new CommissionStep(),
    new DeliveryStep(),
    new RoundingStep(),
    new FinalizeStep(),
  ]);

  calculate(
    request: CalculationRequestContext,
    seedPatch?: Partial<CalculationVersionSeed>,
  ): CalculationResult {
    return this.engine.run(request, seedPatch);
  }
}
