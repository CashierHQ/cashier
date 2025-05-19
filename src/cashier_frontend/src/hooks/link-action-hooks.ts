// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { useLinkActionStore } from "@/stores/linkActionStore";
import {
    useCreateNewLinkMutation,
    useLinkDetailQuery,
    useUpdateLinkMutation,
} from "@/hooks/link-hooks";
import { useEffect } from "react";
import { ACTION_TYPE } from "@/services/types/enum";
import { UserInputItem, useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import { useCreateAction } from "./action-hooks";
import {
    mapUserInputItemToLinkDetailModel,
    mapPartialDtoToLinkDetailModel,
} from "@/services/types/mapper/link.service.mapper";
import { useIdentity } from "@nfid/identitykit/react";
import LinkLocalStorageService, {
    LOCAL_lINK_ID_PREFIX,
} from "@/services/link/link-local-storage.service";
import { LinkModel } from "@/services/types/link.service.types";
import LinkService from "@/services/link/link.service";

export interface UpdateLinkParams {
    linkId: string;
    linkModel: Partial<UserInputItem>;
    isContinue: boolean;
}

export function useLinkAction(linkId?: string, actionType?: ACTION_TYPE) {
    const { setLink, setAction, setLoading, setIsUpdating, setIsProcessingAction, link, action } =
        useLinkActionStore();

    const { getUserInput } = useLinkCreationFormStore();
    const userInput = linkId ? getUserInput(linkId) : undefined;

    const linkDetailQuery = useLinkDetailQuery(linkId, actionType);
    const updateLinkMutation = useUpdateLinkMutation();
    const createActionMutation = useCreateAction();
    const createNewLinkMutation = useCreateNewLinkMutation();
    const identity = useIdentity();

    const getLink = async () => {
        await linkDetailQuery.refetch();
    };

    const callLinkStateMachine = async (params: UpdateLinkParams) => {
        const { linkId, linkModel, isContinue } = params;
        setIsUpdating(true);
        // this already invalidates the query no need to refetch
        try {
            const res = await updateLinkMutation.mutateAsync({
                linkId,
                linkModel,
                isContinue,
            });

            return res;
        } finally {
            setIsUpdating(false);
        }
    };

    const createAction = async (linkId: string, actionType: ACTION_TYPE, actionId?: string) => {
        try {
            setIsProcessingAction(true);
            const res = await createActionMutation.mutateAsync({
                linkId,
                actionType,
                actionId,
            });
            return res;
        } catch (error) {
            console.error("Error creating action", error);
        } finally {
            setIsProcessingAction(false);
        }
    };

    const createNewLink = async (localLinkId: string) => {
        try {
            const res = await createNewLinkMutation.mutateAsync(localLinkId);

            return res;
        } catch (error) {
            console.error("Error creating new link", error);
            return undefined;
        }
    };

    const refetchLinkDetail = async () => {
        await linkDetailQuery.refetch();
    };

    const refetchAction = async (linkId: string, actionType?: ACTION_TYPE) => {
        console.log("refetchAction", linkId, actionType);

        if (!linkId) {
            console.warn("refetchAction called with undefined linkId");
            return;
        }

        try {
            // Clone the same logic from useLinkDetailQuery to ensure consistency
            if (linkId.startsWith(LOCAL_lINK_ID_PREFIX) && identity) {
                console.log("[refetchAction] Using local storage for", linkId);
                const linkLocalStorageService = new LinkLocalStorageService(
                    identity.getPrincipal().toString(),
                );
                const localLink = linkLocalStorageService.getLink(linkId);

                const linkDetailModel = mapPartialDtoToLinkDetailModel(localLink);

                const linkModel: LinkModel = {
                    link: linkDetailModel,
                };

                if (localLink) {
                    // Set link from local storage (action might be undefined)
                    setLink(linkModel.link);
                    setAction(linkModel.action);
                    console.log("[refetchAction] Updated state from local storage", linkModel);
                } else {
                    throw new Error("Link not found in local storage");
                }
            } else {
                console.log("[refetchAction] Fetching from backend for", linkId);
                console.log("[refetchAction] With identity", identity?.getPrincipal().toString());
                console.log("[refetchAction] With actionType", actionType);

                const linkService = new LinkService(identity);
                const res = await linkService.getLink(linkId, actionType);

                // Explicitly set both link and action state
                if (res) {
                    setLink(res.link);
                    setAction(res.action);
                    console.log("[refetchAction] Updated state from backend", res);
                }
            }
        } catch (error) {
            console.error("Error in refetchAction:", error);
        }
    };

    // Update state when query data changes
    useEffect(() => {
        setLoading(linkDetailQuery.isLoading);
    }, [linkDetailQuery.isLoading, linkDetailQuery.data]);

    useEffect(() => {
        if (linkDetailQuery.data) {
            const linkData = linkDetailQuery.data;
            console.log("🚀 ~ useLinkAction ~ linkData:", linkData);
            setLink(linkData.link);
            setAction(linkData.action);
        }
    }, [linkDetailQuery.data]);

    // Update state when linkId changes
    useEffect(() => {
        if (linkId) {
            console.log("[useEffect] linkId changed:", linkId);

            // First update with user input if available
            if (userInput) {
                const linkModel = mapUserInputItemToLinkDetailModel(userInput);
                setLink(linkModel);
            }

            // Then refetch data
            const refetchData = async () => {
                await refetchLinkDetail();
                await refetchAction(linkId, actionType);
            };

            refetchData();
        }
    }, [linkId]);

    // Update state when identity changes
    useEffect(() => {
        console.log("[useEffect] identity changed:", identity?.getPrincipal().toString());

        const refetchData = async () => {
            if (identity && linkId) {
                await refetchAction(linkId, actionType);
            }
        };

        refetchData();
    }, [identity]);

    // Update store with functions
    useEffect(() => {
        useLinkActionStore.setState({
            getLinkDetail: getLink,
            callLinkStateMachine,
            refetchLinkDetail,
            refetchAction,
            createAction,
            createNewLink,
        });
    }, [linkId, link, action, identity, actionType]);

    return useLinkActionStore();
}
