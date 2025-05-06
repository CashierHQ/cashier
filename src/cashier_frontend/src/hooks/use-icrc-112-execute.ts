import { useMutation } from "@tanstack/react-query";
import { useIdentity } from "@nfid/identitykit/react";
import CallSignerService from "@/services/signerService/callSigner.service";
import { Icrc112RequestModel } from "@/services/types/transaction.service.types";
import { SequenceRequest } from "@/services/signerService/icrc112.service";

export function useIcrc112Execute() {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: async ({
            transactions,
        }: {
            transactions: Icrc112RequestModel[][] | undefined;
        }) => {
            const identityProvided = !!identity;
            const transactionsProvided = transactions && transactions.length > 0;

            if (!identityProvided || !transactionsProvided) {
                return;
            }

            const signerService = new CallSignerService(identity);

            try {
                const startTime = Date.now();
                const res = await signerService.execute(transactions as unknown as SequenceRequest);

                const endTime = Date.now();
                const duration = endTime - startTime;
                const durationInSeconds = (duration / 1000).toFixed(2);
                console.log("🚀 [icrc-112]", `${durationInSeconds}s`);
                return res;
            } catch (error) {
                console.error("Error executing ICRC112 transactions:", error);
                throw error;
            }
        },
    });

    return mutation;
}
