import { IcrcMethod } from "@/types/icrc-method";
import { ICanisterCaller } from "./ICanisterCaller";
import { ICRC112Request, Icrc112Requests, Icrc112Response } from "../signerService/icrc112.service";
import { BatchCallCanistersCaller } from "./BatchCallCanistersCaller";
import { HttpAgent } from "@dfinity/agent";

export type Callers = {
    [IcrcMethod.BatchCallCanisters]?: ICanisterCaller<Icrc112Requests, Icrc112Response>;
};

export class NewCanisterCallerService {
    private readonly agent: HttpAgent;
    private readonly callers: Callers;

    constructor(agent: HttpAgent, callers: Callers) {
        this.agent = this.agent;
        this.callers = callers;
    }

    getCallerFor<M extends keyof Callers>(method: M): Callers[M] {
        const caller = this.callers[method];

        return caller;
    }
}

class A implements ICanisterCaller<ICRC112Request, Icrc112Response> {
    call(args: ICRC112Request): Promise<Icrc112Response> {
        throw new Error("Method not implemented.");
    }
}

const service = new NewCanisterCallerService({
    [IcrcMethod.BatchCallCanisters]: new BatchCallCanistersCaller(),
});

const caller = service.getCallerFor(IcrcMethod.BatchCallCanisters);
caller?.call([]);
