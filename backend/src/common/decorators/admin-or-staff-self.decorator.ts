import { applyDecorators } from '@nestjs/common';
import { Roles } from './roles.decorator';
import { StaffSelf, StaffSelfCheck } from './staff-self.decorator';

export const AdminOrStaffSelf = (check: StaffSelfCheck) =>
  applyDecorators(Roles('ADMIN', 'STAFF'), StaffSelf(check));
