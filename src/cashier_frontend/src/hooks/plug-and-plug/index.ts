import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Principal } from "@dfinity/principal";
import { usePlugAndPlay } from "../../contexts/plug-and-play-context";

// Simple hook to create an actor via PnP
export type CreateActorOptions = {
    canisterId: string;
    idl: unknown;
    anon?: boolean;
};

export function usePnpActor<T = unknown>({ canisterId, idl, anon = false }: CreateActorOptions) {
    const { pnp } = usePlugAndPlay();

    const actor = useMemo(() => {
        if (typeof window === "undefined") return null;
        if (!pnp) return null;
        try {
            return pnp.getActor<T>({ canisterId, idl, anon });
        } catch (e) {
            console.error("usePnpActor: failed to create actor", e);
            return null;
        }
    }, [pnp, canisterId, idl, anon]);

    return { pnp, actor } as { pnp: typeof pnp | null; actor: T | null };
}

// Example: hook to fetch icrc1 balance using react-query
type BalanceResult = bigint;
type ActorWithBalance = {
    icrc1_balance_of?: (args: { owner: Principal; subaccount: unknown[] }) => Promise<bigint>;
};

export function useBalance({ canisterId, idl }: { canisterId: string; idl: unknown }) {
    const { actor, pnp } = usePnpActor<ActorWithBalance>({ canisterId, idl, anon: true });

    const fetchBalance = useCallback(async (): Promise<BalanceResult | undefined> => {
        if (!pnp || !pnp.account?.owner) return undefined;
        if (!actor || typeof actor.icrc1_balance_of !== "function") return undefined;

        try {
            const result = await actor.icrc1_balance_of({
                owner: Principal.fromText(pnp.account.owner),
                subaccount: [],
            });
            return result as BalanceResult;
        } catch (err) {
            console.error("useBalance: fetch failed", err);
            return undefined;
        }
    }, [actor, pnp]);

    const query = useQuery({
        queryKey: ["pnp", "balance", canisterId, pnp?.account?.owner],
        queryFn: fetchBalance,
        enabled: !!pnp && !!pnp.account?.owner && !!actor,
    });

    return {
        ...query,
        balance: query.data,
    };
}

export default undefined;

