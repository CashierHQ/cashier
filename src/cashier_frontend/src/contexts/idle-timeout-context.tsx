// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { createContext, useEffect, useRef } from "react";
import { IDLE_TIMEOUT_MILLI_SEC } from "@/const";
import usePnpStore from "@/stores/plugAndPlayStore";

interface IdleTimeoutContextValue {
  updateActivity: () => void;
}

const IdleTimeoutContext = createContext<IdleTimeoutContextValue | null>(null);

const LAST_ACTIVE_KEY = "cashier_lastActive";
const ACTIVITY_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

interface IdleTimeoutProviderProps {
  children: React.ReactNode;
}

export function IdleTimeoutProvider({ children }: IdleTimeoutProviderProps) {
  const { pnp, disconnect, account } = usePnpStore();
  const intervalRef = useRef<number | null>(null);

  // Helper function to get user-specific key
  const getUserKey = () => {
    if (!pnp) return null;
    if (!pnp.isAuthenticated() || !pnp.account?.owner) return null;
    return LAST_ACTIVE_KEY + "_" + pnp.account?.owner;
  };

  const checkAndUpdate = async () => {
    if (!pnp || (!pnp.isAuthenticated() && !pnp.account?.owner)) return;

    const userKey = getUserKey();
    if (!userKey) return;

    const lastActiveStr = localStorage.getItem(userKey);
    const now = Date.now();

    if (!lastActiveStr) {
      // First time, just set the timestamp
      localStorage.setItem(userKey, now.toString());
      return;
    }

    const lastActive = Number(lastActiveStr);
    const timeSinceLastActive = now - lastActive;

    console.log("Idle check:", {
      timeSinceLastActive: timeSinceLastActive,
      timeoutLimit: IDLE_TIMEOUT_MILLI_SEC,
    });

    if (timeSinceLastActive >= IDLE_TIMEOUT_MILLI_SEC) {
      localStorage.removeItem(userKey);
      await disconnect();
    } else {
      // Update timestamp
      localStorage.setItem(userKey, now.toString());
    }
  };

  // Check on app reload/mount - but only when user is available
  useEffect(() => {
    if (account) {
      checkAndUpdate();
    }
  }, [account]); // Depend on user so it runs when user loads

  useEffect(() => {
    if (account) {
      // Check immediately when user connects
      checkAndUpdate();

      // Check every 30 seconds
      intervalRef.current = window.setInterval(
        checkAndUpdate,
        ACTIVITY_UPDATE_INTERVAL,
      );

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [account]);

  const contextValue: IdleTimeoutContextValue = {
    updateActivity: () => {
      const userKey = getUserKey();
      if (userKey) {
        localStorage.setItem(userKey, Date.now().toString());
      }
    },
  };

  return (
    <IdleTimeoutContext.Provider value={contextValue}>
      {children}
    </IdleTimeoutContext.Provider>
  );
}
