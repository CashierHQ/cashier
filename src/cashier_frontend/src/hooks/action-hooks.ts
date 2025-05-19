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

import { useMutation } from "@tanstack/react-query";
import { useIdentity } from "@nfid/identitykit/react";
import LinkService, { UpdateActionInputModel } from "@/services/link/link.service";
import { ACTION_TYPE } from "@/services/types/enum";
import { Principal } from "@dfinity/principal";

// Base type for action parameters
type BaseActionParams = {
    linkId: string;
    actionType: ACTION_TYPE;
    actionId?: string;
};

// Anonymous actions require wallet address
type AnonymousActionParams = BaseActionParams & {
    walletAddress: string;
};

/**
 * Hook for creating a new action with authenticated user
 */
export function useCreateAction() {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: (params: BaseActionParams) => {
            const linkService = new LinkService(identity);
            return linkService.processAction(params);
        },
    });

    return mutation;
}

/**
 * Hook for processing an action with authenticated user
 */
export function useProcessAction() {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: (params: BaseActionParams) => {
            const linkService = new LinkService(identity);
            return linkService.processAction(params);
        },
    });

    return mutation;
}

/**
 * Hook for creating a new action anonymously
 */
export function useCreateActionAnonymous() {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: (params: AnonymousActionParams) => {
            if (identity && Principal.anonymous() !== identity.getPrincipal()) {
                throw new Error("Anonymous user cannot create action");
            }

            const linkService = new LinkService(identity);

            return linkService.processActionAnonymous({
                linkId: params.linkId,
                actionType: params.actionType,
                actionId: undefined,
                walletAddress: params.walletAddress,
            });
        },
    });

    return mutation;
}

/**
 * Hook for processing an existing action anonymously
 */
export function useProcessActionAnonymous() {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: (params: AnonymousActionParams) => {
            if (identity && Principal.anonymous() !== identity.getPrincipal()) {
                throw new Error("Anonymous user cannot create action");
            }

            const linkService = new LinkService(identity);

            return linkService.processActionAnonymous({
                linkId: params.linkId,
                actionType: params.actionType,
                actionId: params.actionId,
                walletAddress: params.walletAddress,
            });
        },
    });

    return mutation;
}

export function useUpdateAction() {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: (vars: UpdateActionInputModel) => {
            const linkService = new LinkService(identity);
            return linkService.updateAction(vars);
        },
    });

    return mutation;
}
