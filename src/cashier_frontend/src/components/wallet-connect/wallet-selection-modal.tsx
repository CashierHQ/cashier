// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Principal } from "@dfinity/principal";

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
import { FEATURE_FLAGS } from "@/const";
import WalletOptionButton from "./wallet-option-button";
import usePnpStore from "@/stores/plugAndPlayStore";
import useWalletModalStore from "@/stores/walletModalStore";

export const WalletSchema = z.object({
  address: z.string().optional(),
  pendingAddress: z.string().optional(),
});

interface WalletSelectionModalProps {
  // Allow changing wallet even when authenticated
  allowChangeWallet?: boolean;
  // Disable input wallet if belong to header
  isHeaderModal?: boolean;
}

export const WalletSelectionModal: React.FC<WalletSelectionModalProps> = ({
  allowChangeWallet = false,
  isHeaderModal = false,
}) => {
  const { t } = useTranslation();
  const { disconnect, account } = usePnpStore();
  const { isOpen, setOpen, onLoginSuccess } = useWalletModalStore();
  const setOnLoginSuccess = useWalletModalStore((s) => s.setOnLoginSuccess);
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
    if (account && isOpen) {
      // If a page registered a post-login callback, call it and clear it
      if (onLoginSuccess) {
        try {
          onLoginSuccess();
        } catch (e) {
          console.error("onLoginSuccess in modal threw:", e);
        }
        setOnLoginSuccess(null);
      }

      setOpen(false);
    }
  }, [account, isOpen, onLoginSuccess, setOnLoginSuccess, setOpen]);

  const handleManualAddressSubmit = () => {
    const address = form.getValues("address");
    if (address && isAddressValid()) {
      // If user is authenticated and we're allowing wallet changes, show disconnect dialog first
      if (allowChangeWallet) {
        showDialog({
          title: t("wallet_connect_modal.logout_title"),
          description: t("wallet_connect_modal.logout_description"),
        });
        // Store the address for use after disconnect confirmation
        form.setValue("pendingAddress", address);
      } else {
        setOpen(false);
      }
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setOpen}>
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
              <WalletOptionButton
                walletId={"iiSigner"}
                title="Internet Identity"
              />
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
          hideDialog();
        }}
        onOpenChange={hideDialog}
      />
    </>
  );
};
