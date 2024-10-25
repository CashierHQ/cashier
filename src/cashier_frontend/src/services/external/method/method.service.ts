import { RPCMessage } from "../types/method.service.types";

export interface MethodService {
    getMethod(): string;
    invokeAndGetComponentData(
        message: MessageEvent<RPCMessage>,
    ): Promise<ComponentData | undefined>;
}
