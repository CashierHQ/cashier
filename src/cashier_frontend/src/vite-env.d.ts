// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.worker.ts" {
  const workerConstructor: {
    new (options?: WorkerOptions): Worker;
  };
  export default workerConstructor;
}

// Build information globals
declare const __APP_VERSION__: string;
declare const __BUILD_HASH__: string;
declare const __BUILD_TIMESTAMP__: string;
declare const __BUILD_MODE__: string;
