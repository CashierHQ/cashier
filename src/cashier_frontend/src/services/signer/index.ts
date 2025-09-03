// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import {
  BatchCallCanisterRequest,
  BatchCallCanisterResponse,
  Signer,
} from "@slide-computer/signer";
import {
  Icrc112RequestModel,
  toRPCRequest,
} from "../types/transaction.service.types";
import { BACKEND_CANISTER_ID } from "@/const";
import { AgentTransport } from "./agentTransport";
import { v4 as v4uuid } from "uuid";
import { Principal } from "@dfinity/principal";
import { ICRC_114_METHOD_NAME } from "./constants";

/**
 * SignerService
 *
 * Lightweight interoperable adapter for delegated identity.
 * Acts as an RPC forwarder.
 * The signer logic (AgentChannel + AgentTransport) handles request dispatch.
 * Provides execute_icrc112 to convert request models to RPC and send via transport.
 */
class SignerService extends Signer<AgentTransport> {
  async execute_icrc112(
    sender: Principal,
    requests: Icrc112RequestModel[][],
  ): Promise<BatchCallCanisterResponse> {
    const batchInput = requests.map((reqGroup) => reqGroup.map(toRPCRequest));
    const request: BatchCallCanisterRequest = {
      id: v4uuid(),
      jsonrpc: "2.0",
      method: "icrc112_batch_call_canister",
      params: {
        sender: sender.toString(),
        requests: batchInput,
        // TODO: remove after @slide-computer/signer upgrade to new schema
        // This is outdated field, but still required by @slide-computer/signer
        validation: {
          canisterId: BACKEND_CANISTER_ID,
          method: ICRC_114_METHOD_NAME,
        },
        // TODO: un-comment after @slide-computer/signer upgrade to new schema
        // This is correct value
        // validationCanisterId: BACKEND_CANISTER_ID,
      },
    };
    const response: BatchCallCanisterResponse = await this.sendRequest(request);
    return response;
  }
}

export default SignerService;
