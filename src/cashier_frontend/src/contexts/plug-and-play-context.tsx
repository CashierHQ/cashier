import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { createPNP, PNP } from "@windoge98/plug-n-play";

export type PnpContextValue = {
  pnp?: PNP;
  // current auth flag (helps components re-render when auth state changes)
  isAuthenticated: boolean;
};

export type PnpCreateOptions = Parameters<typeof createPNP>[0];

const PnpContext = createContext<PnpContextValue | undefined>(undefined);

export const PnpProvider: React.FC<{
  children: React.ReactNode;
  config: PnpCreateOptions;
}> = ({ children, config }) => {
  // create single pnp instance
  const pnp = useMemo(() => {
    return createPNP(config);
  }, [config]);

  // local reactive state for auth and account to trigger re-renders when PNP auth changes
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    if (!pnp) {
      setIsAuthenticated(false);
      return;
    }

    // initial check + periodic polling as fallback if PNP doesn't emit events
    const check = async () => {
      try {
        const auth =
          typeof pnp.isAuthenticated === "function"
            ? await pnp.isAuthenticated()
            : false;
        if (!mounted) return;
        setIsAuthenticated(Boolean(auth));
        // pnp may expose an `account` propery after connect; copy snapshot
      } catch {
        // Ignore errors but ensure we don't keep stale true value
        if (mounted) {
          setIsAuthenticated(false);
        }
      }
    };

    // run immediately then poll
    check();
    const id = window.setInterval(check, 1000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [pnp]);

  const value = useMemo(
    () => ({ pnp, isAuthenticated }),
    [pnp, isAuthenticated]
  );

  return <PnpContext.Provider value={value}>{children}</PnpContext.Provider>;
};

// hook for consuming the context
export const usePlugAndPlay = () => {
  const ctx = useContext(PnpContext);
  if (!ctx) throw new Error("usePlugAndPlay must be used within a PnpProvider");
  return ctx;
};
