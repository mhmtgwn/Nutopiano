import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import type { JwtPayload } from '../../auth/types/jwt-payload';
import { PaymentsService } from './payments.service';
import { IyzicoInitializeDto } from './dto/iyzico-initialize.dto';
import { IyzicoRetrieveDto } from './dto/iyzico-retrieve.dto';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments/iyzico')
export class PaymentsIyzicoController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initialize')
  @Roles('CUSTOMER', 'ADMIN', 'USER')
  @ApiOperation({
    summary: 'Initialize Iyzico CheckoutForm session for an order',
    description:
      'Creates an iyzico CheckoutForm session and returns token + checkoutFormContent/paymentPageUrl. Amount is always taken from server-side order total.',
  })
  @ApiOkResponse({ description: 'OK' })
  async initialize(
    @Req() req: { user: JwtPayload },
    @Body() body: IyzicoInitializeDto,
  ) {
    try {
      const result = await this.paymentsService.initializeIyzicoSession({
        businessId: Number(req.user.businessId),
        orderId: Number(body.orderId),
        userId: Number(req.user.userId),
        callbackUrl: body.callbackUrl?.trim() || null,
      });
      return result.response;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Iyzico initialize failed';
      throw new BadRequestException(message);
    }
  }

  @Post('retrieve')
  @Roles('CUSTOMER', 'ADMIN', 'USER')
  @ApiOperation({
    summary: 'Retrieve Iyzico CheckoutForm result',
    description:
      'Retrieves checkout form payment result using token. Successful results are normalized into Payment + PaymentTransaction.',
  })
  @ApiOkResponse({ description: 'OK' })
  async retrieve(
    @Req() req: { user: JwtPayload },
    @Body() body: IyzicoRetrieveDto,
  ) {
    try {
      const result = await this.paymentsService.retrieveIyzicoSession({
        businessId: Number(req.user.businessId),
        token: body.token,
        conversationId: body.conversationId?.trim() || null,
      });
      return result.response;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Iyzico retrieve failed';
      throw new BadRequestException(message);
    }
  }
}
