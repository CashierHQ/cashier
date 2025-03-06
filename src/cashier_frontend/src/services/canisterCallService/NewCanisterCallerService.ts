import { IcrcMethod } from "@/types/icrc-method";
import { ICanisterCaller } from "./ICanisterCaller";
import { Icrc112Requests, Icrc112Response } from "../signerService/icrc112.service";
import { HttpAgent } from "@dfinity/agent";

export type Callers = {
    [IcrcMethod.BatchCallCanisters]?: ICanisterCaller<Icrc112Requests, Icrc112Response>;
};

export class NewCanisterCallerService {
    public readonly agent: HttpAgent;
    private readonly callers: Callers;

    constructor(agent: HttpAgent, callers: Callers) {
        this.agent = agent;
        this.callers = callers;
    }

    getCallerFor<M extends keyof Callers>(method: M): Callers[M] {
        const caller = this.callers[method];

        return caller;
    }
}
