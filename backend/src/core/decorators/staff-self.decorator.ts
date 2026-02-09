import { SetMetadata } from '@nestjs/common';

export const STAFF_SELF_KEY = 'staffSelf';

export type StaffSelfCheck =
  | { type: 'id'; param: string }
  | { type: 'phone'; param: string };

export const StaffSelf = (check: StaffSelfCheck) => SetMetadata(STAFF_SELF_KEY, check);
