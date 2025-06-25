// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import {
    useCreateAction,
    useCreateActionAnonymous,
    useProcessAction,
    useProcessActionAnonymous,
} from "./action-hooks";
import { useUpdateLinkMutation, useCreateNewLinkMutation } from "@/hooks/link-hooks";
import { UserInputItem } from "@/stores/linkCreationFormStore";

export interface UpdateLinkParams {
    linkId: string;
    linkModel: Partial<UserInputItem>;
    isContinue: boolean;
}

export function useLinkMutations() {
    const updateLinkMutation = useUpdateLinkMutation();
    const createNewLinkMutation = useCreateNewLinkMutation();
    const createActionMutation = useCreateAction();
    const processActionMutation = useProcessAction();
    const createActionAnonymousMutation = useCreateActionAnonymous();
    const processActionAnonymousMutation = useProcessActionAnonymous();

    return {
        callLinkStateMachine: updateLinkMutation.mutateAsync,
        createAction: createActionMutation.mutateAsync,
        createNewLink: createNewLinkMutation.mutateAsync,
        processAction: processActionMutation.mutateAsync,
        createActionAnonymous: createActionAnonymousMutation.mutateAsync,
        processActionAnonymous: processActionAnonymousMutation.mutateAsync,
        isUpdating: updateLinkMutation.isPending,
        isCreatingLink: createNewLinkMutation.isPending,
        isCreatingAction: createActionMutation.isPending,
        isCreatingActionAnonymous: createActionAnonymousMutation.isPending,
        isProcessingAction: processActionMutation.isPending,
        isProcessingActionAnonymous: processActionAnonymousMutation.isPending,
    };
}
