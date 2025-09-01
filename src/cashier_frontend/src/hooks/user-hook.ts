// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useAuth } from "@nfid/identitykit/react";

export const useConnectToWallet = () => {
  const { connect } = useAuth();
  const connectToWallet = (signerIdOrUrl?: string) => {
    connect(signerIdOrUrl);
  };
  return {
    connectToWallet,
  };
};
