import { Icrc112Response } from "@/services/signerService/icrc112.service";

export enum IcrcMethod {
    Icrc1Transfer = "icrc1_transfer",
    Icrc2Approve = "icrc2_approve",
    Icrc2TransferFrom = "icrc2_transfer_from",
    Icrc25SupportedStandards = "icrc25_supported_standards",
    Icrc25Permissions = "icrc25_permissions",
    Icrc25RequestPermissions = "icrc25_request_permissions",
    Icrc34Delegation = "icrc34_delegation",
    Icrc112BatchCallCanisters = "icrc_112_batch_call_canisters",
}

export type JsonRpcVersion = "2.0";

export type GenericJsonResponse<RESULT> = {
    id: string | number;
    jsonrpc: JsonRpcVersion;
    result: RESULT;
};

export type Icrc25SupportedStandardsRawResponse = GenericJsonResponse<{
    supportedStandards: { name: string; url: string }[];
}>;

export type Icrc112BatchCallCanistersRawResponse = GenericJsonResponse<{
    responses: Icrc112Response;
}>;
