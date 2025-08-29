import { useCallback, useRef } from "react";
import { getLinkUserState } from "../linkUserHooks";
import { LinkGetUserStateInputModel } from "@/services/types/link.service.types";
import { ActionModel } from "@/services/types/action.service.types";
import { Identity } from "@dfinity/agent";

interface UsePollingLinkUserStateOptions {
  interval?: number;
  onUpdate?: (action: ActionModel) => void;
  onError?: (error: Error) => void;
}

export const usePollingLinkUserState = (
  options: UsePollingLinkUserStateOptions = {},
) => {
  const { interval = 500, onUpdate, onError } = options;
  const intervalRef = useRef<number | null>(null);
  const isPollingRef = useRef(false);

  const startPolling = useCallback(
    (input: LinkGetUserStateInputModel, identity: Identity | undefined) => {
      if (isPollingRef.current) {
        return; // Already polling
      }

      isPollingRef.current = true;

      const poll = async () => {
        if (!isPollingRef.current) return;

        try {
          const res = await getLinkUserState(input, identity);
          if (res?.action && onUpdate) {
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
    startPolling,
    stopPolling,
    isPolling,
  };
};
