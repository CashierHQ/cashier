// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import AppRouter from "./Router";
import "./locales/config";
import "./index.css";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ImageCacheProvider } from "@/contexts/image-cache-context";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TokenDataProvider } from "./contexts/token-data-context";
import {
  PnpBootstrap,
  default as usePnpStore,
} from "./stores/plugAndPlayStore";
import { IdleTimeoutProvider } from "./contexts/idle-timeout-context";
import { CONFIG } from "./config";

const logBuildInfo = () => {
  const buildInfo = {
    appVersion: __APP_VERSION__,
    buildHash: __BUILD_HASH__,
  };

  if (import.meta.env.MODE === "dev") {
    console.log("App Version:", buildInfo.appVersion);
    console.log("Build Hash:", buildInfo.buildHash);
  }
};

logBuildInfo();

function App() {
  const queryClient = new QueryClient();
  // Ensure PNP store is initialized synchronously so downstream providers
  // that run on mount (e.g. TokenDataProvider) can access `pnp` immediately.
  // Using the store's getState() avoids relying on a component mount ordering.
  usePnpStore().initNew(CONFIG);

  // Console logging is now handled at build time via vite.config.js esbuild.pure option
  // No need for runtime console manipulation

  return (
    <>
      <PnpBootstrap />
      <QueryClientProvider client={queryClient}>
        <TokenDataProvider>
          <ImageCacheProvider>
            <IdleTimeoutProvider>
              <AppRouter />
            </IdleTimeoutProvider>
          </ImageCacheProvider>
          <Toaster
            position="top-center"
            expand={true}
            richColors={true}
            toastOptions={{
              classNames: {
                toast: "toast",
                title: "title",
                description: "description",
                actionButton: "action-button",
                cancelButton: "cancel-button",
                closeButton: "close-button",
              },
            }}
          />
          <ReactQueryDevtools initialIsOpen={true} />
        </TokenDataProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;
