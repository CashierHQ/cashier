import { queryKeys } from "@/lib/queryKeys";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useIdentity } from "@nfid/identitykit/react";
import CallSignerService from "@/services/signerService/callSigner.service";
import { Icrc112RequestModel } from "@/services/types/transaction.service.types";
import { SequenceRequest } from "@/services/signerService/icrc112.service";
import LinkService from "@/services/link/link.service";

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
                return await signerService.execute(transactions as unknown as SequenceRequest);
            } catch (error) {
                console.error("Error executing ICRC112 transactions:", error);
                throw error;
            }
        },
    });

    return mutation;
}

export function useFeePreview(linkId: string | undefined) {
    const identity = useIdentity();

    const query = useQuery({
        queryKey: queryKeys.links.feePreview(linkId, identity).queryKey,
        queryFn: async () => {
            if (!linkId || !identity) return [];
            const linkService = new LinkService(identity);
            return linkService.getFeePreview(linkId);
        },
        enabled: !!linkId && !!identity,
        refetchOnWindowFocus: false,
    });

    return query;
}
