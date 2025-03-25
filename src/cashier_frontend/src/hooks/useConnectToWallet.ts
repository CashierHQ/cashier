import { useAuth, useIdentity } from "@nfid/identitykit/react";
import { useEffect } from "react";
import { SERVICE_CALL_ERROR } from "@/constants/serviceErrorMessage";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import UserService from "@/services/user.service";

export const useConnectToWallet = () => {
    const { connect, disconnect, user } = useAuth();
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

    const connectToWallet = async () => {
        try {
            await connect();
        } catch (error) {
            console.error("Failed to connect wallet:", error);
        }
    };

    return {
        connectToWallet,
        disconnect,
        user,
        appUser,
        identity,
        isUserLoading,
        refetchAppUser,
    };
};
