// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useMutation } from "@tanstack/react-query";
import { useIdentity, useSigner } from "@nfid/identitykit/react";
import { Icrc112RequestModel, toArrayBuffer } from "@/services/types/transaction.service.types";
import { AgentTransport } from "@/services/signer/agentTransport";
import { getAgent } from "@/utils/agent";
import { ICRC112_SUPPORTED_WALLETS } from "@/constants/wallet-options";
import { BACKEND_CANISTER_ID } from "@/const";
import { ICRC_114_METHOD_NAME } from "@/services/signer/constants";
import { Principal } from "@dfinity/principal";
import { Signer } from "@slide-computer/signer";

export function useIcrc112Execute() {
  const identity = useIdentity();
  const signerConfig = useSigner();

  const mutation = useMutation({
    mutationFn: async ({
      transactions,
    }: {
      transactions: Icrc112RequestModel[][] | undefined;
    }) => {
      console.log("useIcrc112Execute called with transactions:", transactions);
      if (!identity) {
        throw new Error("Identity is not available");
      }

      if (transactions === undefined || transactions.length == 0) {
        throw new Error("Transactions not provided");
      }

      // TODO: fallback to normal call if signer does not support ICRC-112
      console.log("Using signer:", signerConfig);
      if (!ICRC112_SUPPORTED_WALLETS.includes(signerConfig?.id || "")) {
        throw new Error(
          "Only Internet Identity is supported for ICRC-112 execution",
        );
      }

      const transport = await AgentTransport.create({
        agent: getAgent(identity),
      });

      const signer = new Signer({
        transport,
      });

      const supportedStandards = await signer.supportedStandards();
      console.log("Supported standards:", supportedStandards);
      if (!supportedStandards.map((s) => s.name).includes("ICRC-112")) {
        throw new Error("ICRC-112 is not supported by the signer");
      }

      if (!BACKEND_CANISTER_ID) {
        throw new Error("BACKEND_CANISTER_ID is not defined");
      }

      const batchInput = transactions.map((reqGroup) => {
        return reqGroup.map(r => {
          return {
            canisterId: r.canisterId,
            method: r.method,
            arg: toArrayBuffer(r.arg),
          }
        });
      });
      const request: {
        sender: Principal;
        requests: {
          canisterId: Principal;
          method: string;
          arg: ArrayBuffer;
        }[][];
        validation?: {
          canisterId: Principal;
          method: string;
        };
      } = {
        sender: identity.getPrincipal(),
        requests: batchInput,
        // TODO: remove after @slide-computer/signer upgrade to new schema
        // This is outdated field, but still required by @slide-computer/signer
        validation: {
          canisterId: Principal.fromText(BACKEND_CANISTER_ID),
          method: ICRC_114_METHOD_NAME,
        },
        // TODO: un-comment after @slide-computer/signer upgrade to new schema
        // This is correct value
        // validationCanisterId: BACKEND_CANISTER_ID,
      };

      try {
        const res = await signer.batchCallCanister(request);
        return res;
      } catch (error) {
        console.error("Error executing ICRC112 transactions:", error);
        throw error;
      }
    },
  });

  return mutation;
}
