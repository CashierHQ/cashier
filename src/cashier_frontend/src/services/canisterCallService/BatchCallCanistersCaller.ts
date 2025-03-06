import { Icrc112Requests, Icrc112Response } from "../signerService/icrc112.service";
import { ICanisterCaller } from "./ICanisterCaller";

export class BatchCallCanistersCaller implements ICanisterCaller<Icrc112Requests, Icrc112Response> {
    constructor() {}

    call(requests: Icrc112Requests): Promise<Icrc112Response> {
        throw new Error("Method not implemented.");
    }
}
