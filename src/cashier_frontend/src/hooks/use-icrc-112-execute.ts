// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useMutation } from "@tanstack/react-query";
import { useIdentity, useSigner } from "@nfid/identitykit/react";
import { Icrc112RequestModel } from "@/services/types/transaction.service.types";
import SignerService from "@/services/signer";
import { AgentTransport } from "@/services/signer/agentTransport";
import { getAgent } from "@/utils/agent";
import { InternetIdentity } from "@nfid/identitykit";

export function useIcrc112Execute() {
  const identity = useIdentity();
  const signerConfig = useSigner()

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
      if (signerConfig?.id != InternetIdentity.id) {
        throw new Error("Only Internet Identity is supported for ICRC-112 execution");
      }

      const transport = await AgentTransport.create({
        agent: getAgent(identity),
      });

      const signerService = new SignerService({
        transport
      });

      const supportedStandards = await signerService.supportedStandards();
      console.log("Supported standards:", supportedStandards);
      if (!supportedStandards.map((s) => s.name).includes("ICRC-112")) {
        throw new Error("ICRC-112 is not supported by the signer");
      }


      try {
        const res = await signerService.execute_icrc112(
          identity.getPrincipal(),
          transactions!,
        );
        return res;
      } catch (error) {
        console.error("Error executing ICRC112 transactions:", error);
        throw error;
      }
    },
  });

  return mutation;
}
