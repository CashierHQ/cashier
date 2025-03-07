import { Icrc112Requests, Icrc112Response } from "@/services/signerService/icrc112.service";

export interface IWallet {
    execute(input: Icrc112Requests): Promise<Icrc112Response>;
}
