import { NewCanisterCallerService } from "./NewCanisterCallerService";

export interface ICanisterCaller<IN, OUT> {
    call(callerService: NewCanisterCallerService, args: IN): Promise<OUT>;
}
