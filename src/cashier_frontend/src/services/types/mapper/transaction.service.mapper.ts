import { Icrc112Request } from "../../../../../declarations/cashier_backend/cashier_backend.did";
import { Icrc112RequestModel } from "../transaction.service.types";

export const mapICRC112Request = (dto: Icrc112Request): Icrc112RequestModel => {
    return {
        arg: dto.arg,
        method: dto.method,
        canisterId: dto.canister_id,
    };
};
