// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import WalletConnectOptionButton from "./wallet-connect-option";
import usePnpStore from "@/stores/plugAndPlayStore";
import { PNP } from "@windoge98/plug-n-play";

interface WalletSelectionModalProps {
  // Modal visibility state
  open: boolean;
  // Callback to control modal visibility
  setOpen: (open: boolean) => void;
  // Callback when wallet is connected, with optional address if manually entered
  onWalletConnected?: (address?: string) => void;
  // Disable input wallet if belong to header
  isHeaderModal?: boolean;
}

export const LandingPageSelectionModal: React.FC<WalletSelectionModalProps> = ({
  open,
  setOpen,
  onWalletConnected,
}) => {
  const { t } = useTranslation();
  const { pnp } = usePnpStore();

  // Auto-proceed if user is already authenticated (only if not allowing wallet change)
  useEffect(() => {
    if (onWalletConnected) {
      onWalletConnected();
    }
  }, [open, onWalletConnected, setOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm !rounded-[2rem] border-none shadow-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {t("wallet_connect_modal.title", {
              defaultValue: "Choose your wallet",
            })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Wallet Connection Options */}
          <div className="flex flex-col gap-2">
            <WalletConnectOptionButton
              walletId={"iiSigner"}
              title="Internet Identity"
              onLoginSuccess={() => setOpen(false)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <WalletConnectOptionButton
              walletId={"oisy"}
              title="Oisy wallet"
              onLoginSuccess={() => setOpen(false)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <WalletConnectOptionButton
              walletId={"plug"}
              title="Plug"
              onLoginSuccess={() => setOpen(false)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <WalletConnectOptionButton
              walletId={"stoic"}
              title="Stoic"
              onLoginSuccess={() => setOpen(false)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
