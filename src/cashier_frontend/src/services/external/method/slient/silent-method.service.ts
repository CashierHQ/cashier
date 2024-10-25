import { RPCMessage } from "@/services/types";
import { ComponentData } from "../interactive/interactive-method.service";
import { MethodService } from "../method.service";

export abstract class SilentMethodService implements MethodService {
    public async invokeAndGetComponentData(
        message: MessageEvent<RPCMessage>,
    ): Promise<ComponentData | undefined> {
        await this.sendResponse(message);
        return undefined;
    }

    abstract getMethod(): string;
    abstract sendResponse(message: MessageEvent<RPCMessage>): Promise<void>;
}
