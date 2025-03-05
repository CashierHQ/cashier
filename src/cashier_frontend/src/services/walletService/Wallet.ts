import { Icrc112Requests, Icrc112Response } from "@/services/signerService/icrc112.service";

export abstract class Wallet {
    public abstract execute(input: Icrc112Requests): Promise<Icrc112Response>;
}
