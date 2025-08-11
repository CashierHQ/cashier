// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { createContext, useEffect, useRef } from "react";
import { useAuth } from "@nfid/identitykit/react";
import { IDLE_TIMEOUT_MILLI_SEC } from "@/App";

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
    const { disconnect, user } = useAuth();
    const intervalRef = useRef<number | null>(null);

    // Helper function to get user-specific key
    const getUserKey = () => {
        if (!user) return null;
        return LAST_ACTIVE_KEY + "_" + user.principal.toString();
    };

    const checkAndUpdate = async () => {
        if (!user) return;

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
        if (user) {
            checkAndUpdate();
        }
    }, [user]); // Depend on user so it runs when user loads

    useEffect(() => {
        if (user) {
            // Check immediately when user connects
            checkAndUpdate();

            // Check every 30 seconds
            intervalRef.current = window.setInterval(checkAndUpdate, ACTIVITY_UPDATE_INTERVAL);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }
    }, [user, disconnect]);

    const contextValue: IdleTimeoutContextValue = {
        updateActivity: () => {
            const userKey = getUserKey();
            if (userKey) {
                localStorage.setItem(userKey, Date.now().toString());
            }
        },
    };

    return (
        <IdleTimeoutContext.Provider value={contextValue}>{children}</IdleTimeoutContext.Provider>
    );
}
