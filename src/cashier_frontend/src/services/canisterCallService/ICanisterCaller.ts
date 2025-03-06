import { HttpAgent } from "@dfinity/agent";

export interface ICanisterCaller<IN, OUT> {
    call(agent: HttpAgent, args: IN): Promise<OUT>;
}
