import { Icrc112Request } from "../../declarations/cashier_backend/cashier_backend.did";

export function flattenAndFindByMethod(
    icrc_112_requests: Icrc112Request[][],
    method: string,
): Icrc112Request | undefined {
    return icrc_112_requests.flat().filter((request) => request.method === method)[0];
}
