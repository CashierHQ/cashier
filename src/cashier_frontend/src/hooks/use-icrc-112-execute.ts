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

            return await signerService.execute(transactions as unknown as SequenceRequest);
        },
    });

    return mutation;
}
