import { queryKeys } from "@/lib/queryKeys";
import LinkService from "@/services/link.service";
import {
    LinkUpdateUserStateInputModel,
    LinkGetUserStateInputModel,
} from "@/services/types/link.service.types";
import { Identity } from "@dfinity/agent";
import { useIdentity } from "@nfid/identitykit/react";
import { useMutation, useQuery } from "@tanstack/react-query";

export function useUpdateLinkUserState() {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: async (vars: { input: LinkUpdateUserStateInputModel }) => {
            const linkService = new LinkService(identity);
            const result = await linkService.updateLinkUserState(vars.input);
            return result;
        },
        onSuccess: (data, variables) => {
            // Invalidate the userState query key
            // const { input } = variables;
            // const userStateInput: LinkGetUserStateInputModel = {
            //     link_id: input.link_id,
            //     action_type: input.action_type,
            //     anonymous_wallet_address: input.anonymous_wallet_address,
            //     create_if_not_exist: input.,
            // };
            // queryClient.invalidateQueries({ queryKey: queryKeys.links.userState(userStateInput, identity).queryKey });
        },
        onError: (e) => {
            console.error("Error updating link user state ", e.message);
        },
    });

    return mutation;
}

export function useLinkUserState(input: LinkGetUserStateInputModel, isEnabled: boolean) {
    const identity = useIdentity();

    return useQuery({
        queryKey: queryKeys.links.userState(input, identity).queryKey,
        queryFn: async () => {
            console.log("🚀 ~ queryFn: ~ input:", input);
            const linkService = new LinkService(identity);
            const userState = await linkService.getLinkUserState(input);
            return userState;
        },
        enabled: isEnabled,
        refetchOnWindowFocus: false,
    });
}

export async function fetchLinkUserState(
    input: LinkGetUserStateInputModel,
    identity: Identity | undefined,
) {
    const linkService = new LinkService(identity);
    return await linkService.getLinkUserState(input);
}
