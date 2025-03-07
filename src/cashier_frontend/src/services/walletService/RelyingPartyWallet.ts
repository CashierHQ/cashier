import { HttpAgent, Identity } from "@dfinity/agent";
import { Icrc112Requests, Icrc112Response } from "../signerService/icrc112.service";
import { IWallet } from "./IWallet";
import { ClientTransport } from "../signerService/transport";
import { ClientSigner } from "../signerService/signer";
import { JsonRequest, JsonResponse } from "@slide-computer/signer";
import { IcrcMethod } from "@/types/icrc-method";
import { JsonObject } from "@dfinity/candid";

export class RelyingPartyWallet implements IWallet {
    private agent: HttpAgent;

    constructor(identity: Identity) {
        this.agent = HttpAgent.createSync({ identity, host: "https://icp0.io" });
    }

    async execute(input: Icrc112Requests): Promise<Icrc112Response> {
        const transport = await ClientTransport.create({
            agent: this.agent,
        });

        const signer = new ClientSigner({ transport });

        const request: JsonRequest = {
            id: "1",
            jsonrpc: "2.0",
            method: IcrcMethod.Icrc112BatchCallCanisters,
            params: {
                sender: (await this.agent.getPrincipal()).toString(),
                requests: input as unknown as JsonObject,
            },
        };

        const response = await signer.sendRequest(request);

        return this.parseResponse<Icrc112Response>(response);
    }

    private parseResponse<T>(response: JsonResponse): T {
        if ("result" in response) {
            return response.result as unknown as T;
        } else {
            throw new Error(`Error in response: ${JSON.stringify(response.error)}`);
        }
    }
}
