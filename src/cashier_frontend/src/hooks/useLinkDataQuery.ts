import { queryKeys } from "@/lib/queryKeys";
import { ACTION_TYPE } from "@/services/types/enum";
import { useIdentity } from "@nfid/identitykit/react";
import { useQuery } from "@tanstack/react-query";

export const useLinkDataQuery = (linkId: string | undefined, actionType?: ACTION_TYPE) => {
    const identity = useIdentity();

    const query = useQuery({
        queryKey: queryKeys.links.detail(linkId, identity, actionType).queryKey,
        queryFn: queryKeys.links.detail(linkId, identity, actionType).queryFn,
        enabled: !!linkId,
        refetchOnWindowFocus: false,
    });

    return query;
};
