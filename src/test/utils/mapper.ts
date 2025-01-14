import { Transaction } from "../../declarations/cashier_backend/cashier_backend.did";
import { ICRCXRequest } from "../helper/signer.service";

function stringToArrayBuffer(str: string): ArrayBuffer {
    const encoder = new TextEncoder();
    return encoder.encode(str).buffer;
}

export function mapTransactionToICRCXRequest(transaction: Transaction): ICRCXRequest {
    return {
        canisterId: transaction.canister_id,
        method: transaction.method,
        arg: transaction.arg,
        nonce: stringToArrayBuffer(transaction.id), // Assuming the id can be parsed as a number
    };
}
