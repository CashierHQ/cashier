import { ComponentData, InteractiveMethodService } from "./interactive-method.service";
import { DelegationChain, DelegationIdentity, Ed25519KeyIdentity } from "@dfinity/identity";
import { Agent, HttpAgent, Identity } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { GenericError } from "../../exception-handler.service";
import { RPCMessage, RPCSuccessResponse } from "@/services/types";
import { accountService } from "../../account.service";
import { callCanisterService } from "../../call-canister.service";
import { consentMessageService } from "../../consent-message.service";
import { interfaceFactoryService } from "../../interface-factory.service";
import { SilentMethodService } from "./silent-method.service";

const HOUR = 3_600_000;
const IC_HOSTNAME = "https://ic0.app";

export interface CallCanisterComponentData extends ComponentData {
    origin: string;
    methodName: string;
    canisterId: string;
    sender: string;
    args: string;
    consentMessage?: string;
}

export interface Icrc49Dto {
    canisterId: string;
    sender: string;
    method: string;
    arg: string;
}

class Icrc49CallCanisterMethodService extends SilentMethodService {
    sendResponse(message: MessageEvent<RPCMessage>): Promise<void> {
        throw new Error("Method not implemented.");
    }
    public getMethod(): string {
        return "icrc49_call_canister";
    }
}

export const icrc49CallCanisterMethodService = new Icrc49CallCanisterMethodService();
