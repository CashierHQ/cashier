// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useMutation } from "@tanstack/react-query";
import {
  Icrc112RequestModel,
  toArrayBuffer,
} from "@/services/types/transaction.service.types";
import { BACKEND_CANISTER_ID } from "@/const";
import { Principal } from "@dfinity/principal";
import usePnpStore from "@/stores/plugAndPlayStore";
import { IIAdapter } from "@/services/plugAndPlay";
import { ICRC_114_METHOD_NAME } from "@/services/plugAndPlay/constants";

export function useIcrc112Execute() {
  const { pnp } = usePnpStore();

  if (!pnp) throw new Error("pnp is required");

  const mutation = useMutation({
    mutationFn: async ({
      transactions,
    }: {
      transactions: Icrc112RequestModel[][] | undefined;
    }) => {
      console.log("useIcrc112Execute called with transactions:", transactions);

      if (transactions === undefined || transactions.length == 0) {
        throw new Error("Transactions not provided");
      }

      // TODO: fallback to normal call if signer does ot support ICRC-112
      const provider = pnp.provider as unknown as IIAdapter;
      const signer = provider.getSigner();

      if (!signer) {
        throw new Error("Signer not initialized");
      }

      const supportedStandards = await signer.supportedStandards();
      console.log("Supported standards:", supportedStandards);
      if (!supportedStandards.map((s) => s.name).includes("ICRC-112")) {
        throw new Error("ICRC-112 is not supported by the signer");
      }

      if (!BACKEND_CANISTER_ID) {
        throw new Error("BACKEND_CANISTER_ID is not defined");
      }

      const batchInput = transactions.map((reqGroup) => {
        return reqGroup.map((r) => {
          return {
            canisterId: r.canisterId,
            method: r.method,
            arg: toArrayBuffer(r.arg),
          };
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
        sender: Principal.anonymous(), // pnp.account?.owner is used by the signer
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
