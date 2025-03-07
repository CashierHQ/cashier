import { IcrcMethod } from "@/types/icrc-method";
import { ICanisterCaller } from "./ICanisterCaller";
import { Icrc112Requests, Icrc112Response } from "../signerService/icrc112.service";
import { HttpAgent } from "@dfinity/agent";
import { JsonRequest, JsonResponse } from "@slide-computer/signer";

export type Callers = {
    [IcrcMethod.Icrc112BatchCallCanisters]?: ICanisterCaller<Icrc112Requests, Icrc112Response>;
};

export type UniversalCaller = ICanisterCaller<JsonRequest, JsonResponse>;
export class NewCanisterCallerService {
    public readonly agent: HttpAgent;
    public readonly callers: Callers;
    public readonly universalCaller: UniversalCaller;

    constructor(agent: HttpAgent, callers: Callers, universalCaller: UniversalCaller) {
        this.agent = agent;
        this.callers = callers;
        this.universalCaller = universalCaller;
    }

    getCallerFor<M extends keyof Callers>(method: M): Callers[M] {
        const caller = this.callers[method];

        if (!caller) {
            throw new Error(`Calling "${method}" is not supported`);
        }

        return caller;
    }

    getUniversalCaller(): UniversalCaller {
        return this.universalCaller;
    }
}
