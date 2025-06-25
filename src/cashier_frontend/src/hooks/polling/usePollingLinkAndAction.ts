import { useCallback, useRef } from "react";
import { getLinkDetailQuery } from "../link-hooks";
import { Identity } from "@dfinity/agent";
import { ActionModel } from "@/services/types/action.service.types";
import { ACTION_TYPE } from "@/services/types/enum";

interface UsePollingLinkDetailOptions {
    interval?: number;
    onUpdate?: (action: ActionModel) => void;
    onError?: (error: Error) => void;
}

export const usePollingLinkAndAction = (options: UsePollingLinkDetailOptions = {}) => {
    const { interval = 500, onUpdate, onError } = options;
    const intervalRef = useRef<number | null>(null);
    const isPollingRef = useRef(false);

    const startPollingLinkDetail = useCallback(
        (linkId: string, actionType: ACTION_TYPE, identity: Identity | undefined) => {
            if (isPollingRef.current) {
                return; // Already polling
            }

            isPollingRef.current = true;

            const poll = async () => {
                if (!isPollingRef.current) return;

                try {
                    const res = await getLinkDetailQuery(linkId, actionType, identity);
                    if (res.action && onUpdate) {
                        console.log("polling res state", res.action.state);
                        onUpdate(res.action);
                    }
                } catch (error) {
                    console.error("Polling error:", error);
                    if (onError) {
                        onError(error as Error);
                    }
                }
            };

            // Start polling immediately
            poll();

            // Set up interval
            intervalRef.current = window.setInterval(poll, interval);
        },
        [interval, onUpdate, onError],
    );

    const stopPolling = useCallback(() => {
        isPollingRef.current = false;
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const isPolling = useCallback(() => isPollingRef.current, []);

    return {
        startPollingLinkDetail,
        stopPolling,
        isPolling,
    };
};
