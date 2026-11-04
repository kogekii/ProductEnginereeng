import type { AdminPickupListQuery as AdminPickupListSchema, PickupListQuery as PickupListSchema, PickupStatus as SharedPickupStatus, PickupSubmissionInput as SharedPickupSubmissionInput } from '../../../shared/pickup.js';

export type PickupStatus = SharedPickupStatus;
export type PickupSubmissionInput = SharedPickupSubmissionInput;
export type PickupListQuery = PickupListSchema;
export type AdminPickupListQuery = AdminPickupListSchema;
