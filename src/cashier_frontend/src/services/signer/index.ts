// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { BatchCallCanisterRequest, BatchCallCanisterResponse, Signer } from "@slide-computer/signer";
import { getAgent } from "@/utils/agent";
import { AgentTransport } from "@slide-computer/signer-test";
import { Icrc112RequestModel, toRPCRequest } from "../types/transaction.service.types";

class SignerV2 {
    private agent: HttpAgent;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.agent = getAgent(identity);
    }

    async execute(requests: Icrc112RequestModel[][]): Promise<BatchCallCanisterResponse> {
        const transport = await AgentTransport.create({
            agent: this.agent,
        });
        const signer = new Signer({
            transport,
            autoCloseTransportChannel: false,
            closeTransportChannelAfter: 60 * 60 * 1000, // 1 hour
        });

        const batchInput = requests.map((reqGroup) => reqGroup.map(toRPCRequest));

        const request: BatchCallCanisterRequest = {
            id: "2",
            jsonrpc: "2.0",
            method: "icrc112_batch_call_canister",
            params: {
                sender: (await this.agent.getPrincipal()).toString(),
                requests: batchInput,
            },
        };
        const response: BatchCallCanisterResponse = await signer.sendRequest(request);
        console.log(
            "🚀 ~ CallSignerService ~ executeIcrc112 ~ response:",
            response,
        );
        return response;
    }


}

export default SignerV2;
