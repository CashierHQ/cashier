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

import { useAuth, useIdentity } from "@nfid/identitykit/react";
import { useEffect } from "react";
import { SERVICE_CALL_ERROR } from "@/constants/serviceErrorMessage";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import UserService from "@/services/user.service";

export const useConnectToWallet = () => {
    const { user, connect } = useAuth();
    const identity = useIdentity();

    const {
        data: appUser,
        isLoading: isUserLoading,
        error: loadUserError,
        refetch: refetchAppUser,
    } = useQuery({
        ...queryKeys.users.detail(identity),
        retry: 1,
        enabled: !!identity,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        const createUser = async () => {
            if (!identity) return;

            const userService = new UserService(identity);
            try {
                await userService.createUser();
                await refetchAppUser();
            } catch (error) {
                console.log("🚀 ~ createUser ~ error:", error);
            }
        };

        if (
            identity &&
            !appUser &&
            loadUserError?.message.toLowerCase().includes(SERVICE_CALL_ERROR.USER_NOT_FOUND)
        ) {
            createUser();
        }
    }, [identity, appUser, loadUserError]);

    const connectToWallet = (signerIdOrUrl?: string) => {
        connect(signerIdOrUrl);
    };

    return {
        user,
        appUser,
        identity,
        isUserLoading,
        refetchAppUser,
        connectToWallet,
    };
};
