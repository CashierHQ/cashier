// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Principal } from "@dfinity/principal";
import { useAuth, useIdentity } from "@nfid/identitykit/react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// ...existing code...
import ConfirmDialog from "../confirm-dialog";
import ManualAddressInput from "./manual-address-input";

import { useConfirmDialog } from "@/hooks/useDialog";
import { useSignerStore } from "@/stores/signerStore";
import { useConnectToWallet } from "@/hooks/user-hook";
import {
  WALLET_OPTIONS,
  GoogleSigner,
  LocalInternetIdentity,
} from "@/constants/wallet-options";
import { InternetIdentity } from "@nfid/identitykit";
import { FEATURE_FLAGS } from "@/const";
import WalletOptionButton from "./wallet-option-button";

export const WalletSchema = z.object({
  address: z.string().optional(),
  pendingAddress: z.string().optional(),
});

interface WalletSelectionModalProps {
  // Modal visibility state
  open: boolean;
  // Callback to control modal visibility
  onOpenChange: (open: boolean) => void;
  // Callback when wallet is connected, with optional address if manually entered
  onWalletConnected?: (address?: string) => void;
  // Allow changing wallet even when authenticated
  allowChangeWallet?: boolean;
  // Disable input wallet if belong to header
  isHeaderModal?: boolean;
}

export const WalletSelectionModal: React.FC<WalletSelectionModalProps> = ({
  open,
  onOpenChange,
  onWalletConnected,
  allowChangeWallet = false,
  isHeaderModal = false,
}) => {
  const { t } = useTranslation();
  const { disconnect } = useAuth();
  const identity = useIdentity();
  const { connectToWallet } = useConnectToWallet();
  const { setCurrentConnectOption } = useSignerStore();
  const {
    open: confirmOpen,
    options,
    hideDialog,
    showDialog,
  } = useConfirmDialog();

  const form = useForm<z.infer<typeof WalletSchema>>({
    resolver: zodResolver(WalletSchema),
    defaultValues: {
      address: "",
    },
  });

  const isAddressValid = () => {
    const address = form.getValues("address");
    if (!address) return false;

    try {
      Principal.fromText(address);
      return true;
    } catch {
      return false;
    }
  };

  // Auto-proceed if user is already authenticated (only if not allowing wallet change)
  useEffect(() => {
    if (identity && open && !allowChangeWallet) {
      if (onWalletConnected) {
        onWalletConnected();
      }
      onOpenChange(false);
    }
  }, [identity, open, onWalletConnected, onOpenChange, allowChangeWallet]);

  const checkForExistingWallet = (): boolean => {
    const hasAddress = (form.getValues("address") ?? "").trim().length > 0;
    // Only show disconnect dialog if we're allowing wallet changes and user is connected
    if ((hasAddress || identity) && allowChangeWallet) {
      showDialog({
        title: "Are you sure?",
        description:
          "You are connected to another wallet. Would you like to disconnect and continue?",
      });
      return true;
    }
    return false;
  };

  const handleConnectWallet = (walletOption: WALLET_OPTIONS) => {
    if (checkForExistingWallet()) {
      return;
    }

    setCurrentConnectOption(walletOption);

    switch (walletOption) {
      case WALLET_OPTIONS.INTERNET_IDENTITY:
        if (!identity) {
          if (FEATURE_FLAGS.ENABLE_LOCAL_IDENTITY_PROVIDER) {
            connectToWallet(LocalInternetIdentity.id);
          } else {
            connectToWallet(InternetIdentity.id);
          }
        }
        break;
      case WALLET_OPTIONS.OTHER:
        break;
      case WALLET_OPTIONS.GOOGLE:
        if (!identity) {
          connectToWallet(GoogleSigner.id);
        }
        break;
    }
  };

  const handleManualAddressSubmit = () => {
    const address = form.getValues("address");
    if (address && isAddressValid()) {
      // If user is authenticated and we're allowing wallet changes, show disconnect dialog first
      if (identity && allowChangeWallet) {
        showDialog({
          title: "Are you sure?",
          description:
            "You are connected to another wallet. Would you like to disconnect and use this address instead?",
        });
        // Store the address for use after disconnect confirmation
        form.setValue("pendingAddress", address);
      } else {
        if (onWalletConnected) {
          onWalletConnected(address);
        }
        onOpenChange(false);
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm !rounded-[2rem] border-none shadow-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {t("claim.choose_wallet_title", {
                defaultValue: "Choose your wallet",
              })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Wallet Connection Options */}
            <div className="flex flex-col gap-2">
              <WalletOptionButton
                walletOption={WALLET_OPTIONS.INTERNET_IDENTITY}
                title="Internet Identity"
                identity={identity}
                handleConnect={handleConnectWallet}
              />
              {FEATURE_FLAGS.ENABLE_ANONYMOUS_GOOGLE_LOGIN && (
                <WalletOptionButton
                  walletOption={WALLET_OPTIONS.GOOGLE}
                  title="Google"
                  identity={identity}
                  handleConnect={handleConnectWallet}
                  disabled={true}
                />
              )}
            </div>

            {FEATURE_FLAGS.ENABLE_ANONYMOUS_USE_LINK && isHeaderModal && (
              <ManualAddressInput
                form={form}
                onSubmit={handleManualAddressSubmit}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title={options.title}
        description={options.description}
        actionText="Disconnect"
        onSubmit={() => {
          disconnect();
          form.clearErrors();
          setCurrentConnectOption(undefined);
          hideDialog();
        }}
        onOpenChange={hideDialog}
      />
    </>
  );
};
