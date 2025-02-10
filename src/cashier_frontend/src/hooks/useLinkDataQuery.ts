import { queryKeys } from "@/lib/queryKeys";
import { Identity } from "@dfinity/agent";
import { useQuery } from "@tanstack/react-query";

export const useLinkDataQuery = (
    linkId: string | undefined,
    actionType: string,
    identity: Identity | undefined,
) => {
    const query = useQuery({
        queryKey: queryKeys.links.detail(linkId, actionType, identity).queryKey,
        queryFn: queryKeys.links.detail(linkId, actionType, identity).queryFn,
        enabled: !!linkId && !!identity,
    });

    return query;
};
