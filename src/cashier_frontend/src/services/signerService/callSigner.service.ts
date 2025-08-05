// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { Icrc112Requests, Icrc112Response } from "./icrc112.service";
import { Signer } from "./signer";
import { ClientTransport } from "./transport";
import { JsonRequest, JsonResponse } from "@slide-computer/signer";
import type { JsonObject } from "@dfinity/candid";
import { IC_INTERNET_IDENTITY_PROVIDER } from "@/const";
import { getAgent } from "@/utils/agent";

class CallSignerService {
    private agent: HttpAgent;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.agent = getAgent(identity);
    }

    async execute(input: Icrc112Requests): Promise<Icrc112Response> {
        const transport = await ClientTransport.create({
            agent: this.agent,
            authClientLoginOptions: {
                identityProvider: IC_INTERNET_IDENTITY_PROVIDER,
                maxTimeToLive: BigInt(8) * BigInt(3_600_000_000_000),
            },
        });
        const signer = new Signer({
            transport,
            autoCloseTransportChannel: false,
            closeTransportChannelAfter: 60 * 60 * 1000, // 1 hour
        });

        const request: JsonRequest = {
            id: "1",
            jsonrpc: "2.0",
            method: "icrc112_batch_call_canister",
            params: {
                sender: (await this.agent.getPrincipal()).toString(),
                requests: input as unknown as JsonObject,
            },
        };
        const response = await signer.sendRequest(request);
        console.log("🚀 ~ CallSignerService ~ executeIcrc112 ~ response:", response);
        return this.parseResponse<Icrc112Response>(response);
    }

    private parseResponse<T>(jsonObj: JsonResponse): T {
        if ("result" in jsonObj) {
            return jsonObj.result as unknown as T;
        } else {
            throw new Error(`Error in response: ${JSON.stringify(jsonObj.error)}`);
        }
    }
}

export default CallSignerService;
