import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@core/decorators';
import { JwtAuthGuard, RolesGuard } from '@core/guards';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) { }

  @Post()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Create customer',
    description:
      'ADMIN and STAFF can create customers in their own business. The createdByUserId is set to the calling user.',
  })
  @ApiOkResponse({ description: 'The created customer.' })
  @ApiForbiddenResponse({ description: 'Forbidden for roles other than ADMIN or STAFF.' })
  create(@Req() req: { user: JwtPayload }, @Body() payload: CreateCustomerDto) {
    return this.customersService.create(req.user, payload);
  }

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'List customers',
    description:
      'ADMIN sees all customers in their business. STAFF sees only customers they created in their business.',
  })
  @ApiOkResponse({ description: 'Array of customers scoped to the current business and role.' })
  @ApiForbiddenResponse({ description: 'Forbidden for roles other than ADMIN or STAFF.' })
  findAll(@Req() req: { user: JwtPayload }) {
    return this.customersService.findAll(req.user);
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Get customer by id',
    description:
      'ADMIN can fetch any customer by id in their business. STAFF can only access customers they created. Cross-tenant access is not allowed.',
  })
  @ApiOkResponse({ description: 'Customer matching the given id within the current business and access rules.' })
  @ApiForbiddenResponse({ description: 'STAFF trying to access a customer created by another user.' })
  @ApiNotFoundResponse({ description: 'Customer with the given id does not exist in the current business.' })
  findOne(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.customersService.findOne(req.user, Number(id));
  }

  @Patch(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Update customer',
    description:
      'ADMIN can update any customer in their business. STAFF can only update customers they created. Cross-tenant access is not allowed.',
  })
  @ApiOkResponse({ description: 'Updated customer.' })
  @ApiForbiddenResponse({ description: 'STAFF trying to update a customer created by another user.' })
  @ApiNotFoundResponse({ description: 'Customer with the given id does not exist in the current business.' })
  update(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: UpdateCustomerDto,
  ) {
    return this.customersService.update(req.user, Number(id), payload);
  }

  @Delete(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Delete customer',
    description:
      'ADMIN can delete any customer in their business. STAFF can only delete customers they created. Cross-tenant access is not allowed.',
  })
  @ApiOkResponse({ description: 'Deleted customer.' })
  @ApiForbiddenResponse({ description: 'STAFF trying to delete a customer created by another user.' })
  @ApiNotFoundResponse({ description: 'Customer with the given id does not exist in the current business.' })
  remove(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.customersService.remove(req.user, Number(id));
  }

  @Get('me')
  @Roles('CUSTOMER', 'STAFF', 'ADMIN')
  @ApiOperation({
    summary: 'Get or create customer record for current user',
    description:
      'Returns the customer record linked to the authenticated user. If no customer record exists, creates one automatically. This is used for checkout flow where users need a customer record.',
  })
  @ApiOkResponse({ description: 'Customer record for the current user.' })
  getMyCustomerRecord(@Req() req: { user: JwtPayload }) {
    return this.customersService.findOrCreateForUser(req.user);
  }
}
