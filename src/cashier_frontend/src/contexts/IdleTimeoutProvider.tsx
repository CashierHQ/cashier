// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { createContext, useContext, useEffect, useRef } from "react";
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

    const checkAndUpdate = async () => {
        if (!user) return;

        const lastActiveStr = localStorage.getItem(
            LAST_ACTIVE_KEY + "_" + user.principal.toString(),
        );
        const now = Date.now();

        if (!lastActiveStr) {
            // First time, just set the timestamp
            console.log("set LAST_ACTIVE_KEY 34");
            localStorage.setItem(LAST_ACTIVE_KEY, now.toString());
            return;
        }

        const lastActive = Number(lastActiveStr);
        const timeSinceLastActive = now - lastActive;

        console.log("Idle check:", {
            timeSinceLastActive: timeSinceLastActive,
            timeoutLimit: IDLE_TIMEOUT_MILLI_SEC,
        });

        if (timeSinceLastActive >= IDLE_TIMEOUT_MILLI_SEC) {
            console.log("Idle timeout exceeded, disconnecting");
            localStorage.removeItem(LAST_ACTIVE_KEY);
            await disconnect();
        } else {
            // Update timestamp
            console.log("set LAST_ACTIVE_KEY 53");

            localStorage.setItem(LAST_ACTIVE_KEY, now.toString());
        }
    };

    // Check on app reload/mount
    useEffect(() => {
        checkAndUpdate();
    }, []); // Empty dependency - runs only on mount

    useEffect(() => {
        if (user) {
            // Check immediately when user connects
            checkAndUpdate();

            // Check every 30 seconds
            intervalRef.current = setInterval(checkAndUpdate, ACTIVITY_UPDATE_INTERVAL);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }
    }, [user, disconnect]);

    const contextValue: IdleTimeoutContextValue = {
        updateActivity: () => {
            if (user) {
                localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
            }
        },
    };

    return (
        <IdleTimeoutContext.Provider value={contextValue}>{children}</IdleTimeoutContext.Provider>
    );
}

export function useIdleTimeout() {
    const context = useContext(IdleTimeoutContext);
    if (!context) {
        throw new Error("useIdleTimeout must be used within an IdleTimeoutProvider");
    }
    return context;
}
