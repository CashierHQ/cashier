import { fromBase64, JsonRequest, JsonResponse } from "@slide-computer/signer";
import { ICanisterCaller } from "./ICanisterCaller";
import { NewCanisterCallerService } from "./NewCanisterCallerService";

type CallArgs = {
    canisterId: string;
    request: {
        method: string;
        args: string;
    };
};

export class UniversalCaller implements ICanisterCaller<CallArgs, JsonResponse> {
    call(callerService: NewCanisterCallerService, args: CallArgs): Promise<JsonResponse> {
        callerService.agent.call(args.canisterId, {
            methodName: args.request.method,
            arg: fromBase64(args.request.args),
        });
    }
}
