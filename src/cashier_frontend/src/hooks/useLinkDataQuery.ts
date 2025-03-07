import { queryKeys } from "@/lib/queryKeys";
import { ACTION_TYPE } from "@/services/types/enum";
import { useIdentity } from "@nfid/identitykit/react";
import { useQuery } from "@tanstack/react-query";

export const useLinkDataQuery = (linkId: string | undefined) => {
    const identity = useIdentity();

    const query = useQuery({
        queryKey: queryKeys.links.detail(linkId, ACTION_TYPE.CREATE_LINK, identity).queryKey,
        queryFn: queryKeys.links.detail(linkId, ACTION_TYPE.CREATE_LINK, identity).queryFn,
        enabled: !!linkId && !!identity,
        refetchOnWindowFocus: false,
    });

    return query;
};
