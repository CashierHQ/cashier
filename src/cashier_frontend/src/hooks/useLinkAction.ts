// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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
import { LOCAL_lINK_ID_PREFIX } from "@/services/link/link-local-storage.service";
import { LinkModel } from "@/services/types/link.service.types";
import LinkService from "@/services/link/link.service";
import LinkLocalStorageServiceV2 from "@/services/link/link-local-storage.service.v2";

export interface UpdateLinkParams {
    linkId: string;
    linkModel: Partial<UserInputItem>;
    isContinue: boolean;
}

export function useLinkAction(linkId?: string, actionType?: ACTION_TYPE) {
    const { setLink, setAction, setLoading, setIsUpdating, setIsProcessingAction, link, action } =
        useLinkActionStore();

    const { getUserInput } = useLinkCreationFormStore();

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
            return;
        }

        try {
            // Clone the same logic from useLinkDetailQuery to ensure consistency
            if (linkId.startsWith(LOCAL_lINK_ID_PREFIX) && identity) {
                const linkLocalStorageService = new LinkLocalStorageServiceV2(
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
        console.log("Link detail query loading:", linkDetailQuery.isLoading);
    }, [linkDetailQuery.isLoading, linkDetailQuery.data]);

    useEffect(() => {
        console.log("Link detail query data:", linkDetailQuery.data);
        if (linkDetailQuery.data) {
            const linkData = linkDetailQuery.data;
            setLink(linkData.link);
            setAction(linkData.action);
        }
    }, [linkDetailQuery.data]);

    // Update state when linkId changes
    useEffect(() => {
        if (linkId) {
            const userInput = linkId ? getUserInput(linkId) : undefined;

            // First update with user input if available
            if (userInput) {
                const linkModel = mapUserInputItemToLinkDetailModel(userInput);
                setLink(linkModel);
            }
        }
    }, [linkId]);

    // Update state when identity changes
    useEffect(() => {
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
