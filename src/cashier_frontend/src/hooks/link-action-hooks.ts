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
import { mapUserInputItemToLinkDetailModel } from "@/services/types/mapper/link.service.mapper";

export interface UpdateLinkParams {
    linkId: string;
    linkModel: Partial<UserInputItem>;
    isContinue: boolean;
}

export function useLinkAction(linkId?: string, actionType?: ACTION_TYPE) {
    const { setLink, setAction, setLoading, setIsUpdating, setIsProcessingAction } =
        useLinkActionStore();

    const { getUserInput } = useLinkCreationFormStore();
    const userInput = linkId ? getUserInput(linkId) : undefined;

    const linkDetailQuery = useLinkDetailQuery(linkId, actionType);
    const updateLinkMutation = useUpdateLinkMutation();
    const createActionMutation = useCreateAction();
    const createNewLinkMutation = useCreateNewLinkMutation();

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

    const refetchAction = async () => {
        await linkDetailQuery.refetch();
    };

    useEffect(() => {
        setLoading(linkDetailQuery.isLoading);
    }, [linkDetailQuery.isLoading, linkDetailQuery.data]);

    useEffect(() => {
        if (linkDetailQuery.data) {
            console.log("[useEffect] linkId", linkId);
            console.log("[useEffect] actionType", actionType);
            const linkData = linkDetailQuery.data;
            console.log("🚀 ~ useLinkAction ~ linkData:", linkData);
            setLink(linkData.link);
            setAction(linkData.action);
        }
    }, [linkDetailQuery.data]);

    // Refetch when the effective ID changes (either linkId prop or currentLinkId in store)
    useEffect(() => {
        const refetchData = async () => {
            await refetchLinkDetail();
            await refetchAction();
        };

        if (linkId) {
            if (userInput) {
                const linkModel = mapUserInputItemToLinkDetailModel(userInput);
                setLink(linkModel);
            }
            refetchData();
        }
    }, [linkId]);

    useEffect(() => {
        console.log("linkDetailQuery.data", linkDetailQuery.data);
    }, [linkDetailQuery.data]);

    useEffect(() => {
        useLinkActionStore.setState({
            getLinkDetail: getLink,
            callLinkStateMachine,
            refetchLinkDetail,
            refetchAction,
            createAction,
            createNewLink,
        });
    }, []);

    return useLinkActionStore();
}
