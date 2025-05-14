import { queryKeys } from "@/lib/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { useIdentity } from "@nfid/identitykit/react";
import LinkService from "@/services/link/link.service";

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
