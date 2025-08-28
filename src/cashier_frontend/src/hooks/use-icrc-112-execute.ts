// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useMutation } from "@tanstack/react-query";
import { useIdentity } from "@nfid/identitykit/react";
import { Icrc112RequestModel } from "@/services/types/transaction.service.types";
import SignerV2 from "@/services/signer";

export function useIcrc112Execute() {
  const identity = useIdentity();

  const mutation = useMutation({
    mutationFn: async ({
      transactions,
    }: {
      transactions: Icrc112RequestModel[][] | undefined;
    }) => {
      const transactionsProvided = transactions && transactions.length > 0;

      if (!identity) {
        throw new Error("Identity is not available");
      }

      if (transactions === undefined || !transactionsProvided) {
        throw new Error("Transactions not provided");
      }

      // TODO check signer support ICRC-112
      // TODO if not support, fallback to old implementation
      const signerService = new SignerV2(identity);


      try {
        const res = await signerService.execute(
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
