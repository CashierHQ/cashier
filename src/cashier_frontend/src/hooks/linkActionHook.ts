import { useLinkActionStore } from "@/stores/linkActionStore";
import { useLinkDetailQuery, useUpdateLink } from "@/hooks/link-hooks";
import { useEffect } from "react";
import { identity } from "lodash";
import { ACTION_TYPE } from "@/services/types/enum";
import { UserInputItem } from "@/stores/linkCreationFormStore";
import { useCreateAction } from "./action-hooks";

export interface UpdateLinkParams2 {
    linkId: string;
    linkModel: Partial<UserInputItem>;
    isContinue: boolean;
}

export function useLinkAction(linkId?: string, actionType?: ACTION_TYPE) {
    const { setLink, setAction, setLoading, setIsUpdating, setIsProcessingAction } =
        useLinkActionStore();

    const linkDetailQuery = useLinkDetailQuery(linkId, actionType);
    const updateLinkMutation = useUpdateLink();
    const createActionMutation = useCreateAction();

    const getLink = async () => {
        linkDetailQuery.refetch();
    };

    const callLinkStateMachine = async (params: UpdateLinkParams2) => {
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

    const refetchLinkDetail = async () => {
        await linkDetailQuery.refetch();
    };

    const refetchAction = async () => {
        await linkDetailQuery.refetch();
    };

    useEffect(() => {
        setLoading(linkDetailQuery.isLoading);
    }, [linkDetailQuery.isLoading, linkDetailQuery.data]);

    useEffect(() => {
        if (linkDetailQuery.data) {
            const linkData = linkDetailQuery.data;
            setLink(linkData.link);
            setAction(linkData.action);
        }
    }, [linkDetailQuery.data]);

    useEffect(() => {
        useLinkActionStore.setState({
            getLinkDetail: getLink,
            callLinkStateMachine,
            refetchLinkDetail,
            refetchAction,
            createAction,
        });
    }, [identity]);

    return useLinkActionStore();
}
