// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { Icrc112Request } from "../../../generated/cashier_backend/cashier_backend.did";
import { Icrc112RequestModel } from "../transaction.service.types";

export const mapICRC112Request = (dto: Icrc112Request): Icrc112RequestModel => {
  return {
    arg: dto.arg,
    method: dto.method,
    canisterId: dto.canister_id,
  };
};
