// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { useState, useEffect } from "react";
import { IoWalletOutline } from "react-icons/io5";
import { IoMdClose } from "react-icons/io";
import { FaCheck } from "react-icons/fa";
import { ClipboardIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Principal } from "@dfinity/principal";
import { useAuth, useIdentity, useSigner } from "@nfid/identitykit/react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { IconInput } from "./icon-input";
import WalletButton from "./use-page/connect-wallet-button";
import CustomConnectedWalletButton from "./use-page/connected-wallet-button";
import ConfirmDialog from "./confirm-dialog";
import WalletConnectDialog from "./wallet-connect-dialog";
import { ErrorMessageWithIcon } from "./ui/error-message-with-icon";

import { useConfirmDialog } from "@/hooks/useDialog";
import { useSignerStore } from "@/stores/signerStore";
import { useConnectToWallet } from "@/hooks/user-hook";
import {
  WALLET_OPTIONS,
  walletDialogConfigOptions,
  getWalletIcon,
  GoogleSigner,
} from "@/constants/wallet-options";
import { InternetIdentity, NFIDW, Stoic } from "@nfid/identitykit";

const WalletSchema = z.object({
  address: z.string().optional(),
  pendingAddress: z.string().optional(),
});

interface WalletSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWalletConnected: (address?: string) => void;
  allowChangeWallet?: boolean; // Allow changing wallet even when authenticated
}

export const WalletSelectionModal: React.FC<WalletSelectionModalProps> = ({
  open,
  onOpenChange,
  onWalletConnected,
  allowChangeWallet = false,
}) => {
  const { t } = useTranslation();
  const { user, disconnect } = useAuth();
  const identity = useIdentity();
  const signer = useSigner();
  const { connectToWallet } = useConnectToWallet();
  const { setCurrentConnectOption } = useSignerStore();
  const {
    open: confirmOpen,
    options,
    hideDialog,
    showDialog,
  } = useConfirmDialog();

  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof WalletSchema>>({
    resolver: zodResolver(WalletSchema),
    defaultValues: {
      address: "",
    },
  });

  const isGoogleLogin = signer?.id === "GoogleSigner";

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
      onWalletConnected();
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
          connectToWallet(InternetIdentity.id);
        }
        break;
      case WALLET_OPTIONS.OTHER:
        if (!identity) {
          setIsWalletDialogOpen(true);
        }
        break;
      case WALLET_OPTIONS.GOOGLE:
        if (!identity) {
          connectToWallet(GoogleSigner.id);
        }
        break;
    }
  };

  const handlePasteClick = async (field: {
    onChange: (value: string) => void;
  }) => {
    try {
      const text = await navigator.clipboard.readText();
      field.onChange(text);
      validateAddress(text);
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  };

  const validateAddress = (addressValue: string) => {
    try {
      if (addressValue) {
        Principal.fromText(addressValue);
        form.clearErrors("address");
      } else {
        form.clearErrors("address");
      }
    } catch {
      form.setError("address", {
        type: "manual",
        message: "wallet-format-error",
      });
    }
  };

  const handleWalletSelection = (walletId: string) => {
    setIsWalletDialogOpen(false);

    if (walletId === "stoic") {
      connectToWallet(Stoic.id);
    } else if (walletId === "nfid") {
      connectToWallet(NFIDW.id);
    } else if (walletId === "internet-identity") {
      connectToWallet(InternetIdentity.id);
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
        onWalletConnected(address);
        onOpenChange(false);
      }
    }
  };

  const dialogOptions = walletDialogConfigOptions.map((option) => ({
    ...option,
    onClick: () => handleWalletSelection(option.id),
  }));

  const renderWalletButton = (
    walletOption: WALLET_OPTIONS,
    title: string,
    iconOrImage?: string | JSX.Element,
    disabled?: boolean,
  ) => {
    const finalIconOrImage = iconOrImage || getWalletIcon(walletOption);

    const isConnected =
      identity &&
      ((walletOption === WALLET_OPTIONS.GOOGLE && isGoogleLogin) ||
        (walletOption === WALLET_OPTIONS.INTERNET_IDENTITY &&
          signer?.id === "InternetIdentity") ||
        (walletOption === WALLET_OPTIONS.OTHER &&
          signer?.id !== "InternetIdentity" &&
          !isGoogleLogin));

    if (isConnected) {
      return (
        <CustomConnectedWalletButton
          connectedAccount={user?.principal.toString()}
          postfixText="Connected"
          postfixIcon={
            typeof finalIconOrImage === "string" ? (
              <img
                src={finalIconOrImage}
                alt={title}
                className="w-6 h-6 mr-2"
              />
            ) : null
          }
          handleConnect={() => handleConnectWallet(walletOption)}
          disabled={disabled}
        />
      );
    }

    return (
      <WalletButton
        title={title}
        handleConnect={() => handleConnectWallet(walletOption)}
        image={
          typeof finalIconOrImage === "string" ? finalIconOrImage : undefined
        }
        icon={
          typeof finalIconOrImage !== "string" ? finalIconOrImage : undefined
        }
        disabled={disabled}
        postfixText={disabled ? "Coming Soon" : undefined}
      />
    );
  };

  const addressValue = form.watch("address");
  const hasValidAddress = addressValue && isAddressValid();

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
              {renderWalletButton(
                WALLET_OPTIONS.INTERNET_IDENTITY,
                "Internet Identity",
              )}
              {renderWalletButton(
                WALLET_OPTIONS.GOOGLE,
                "Google",
                undefined,
                true,
              )}
              {renderWalletButton(
                WALLET_OPTIONS.OTHER,
                "Other wallets",
                undefined,
                true,
              )}
            </div>

            {/* Manual Address Input */}
            <div>
              <Form {...form}>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <IconInput
                          isCurrencyInput={false}
                          icon={
                            <IoWalletOutline
                              color="#359F89"
                              className="mr-2 h-6 w-6"
                            />
                          }
                          rightIcon={
                            field.value && form.formState.errors.address ? (
                              <IoMdClose color="red" className="mr-1 h-5 w-5" />
                            ) : field.value &&
                              !form.formState.errors.address ? (
                              <FaCheck
                                color="#36A18B"
                                className="mr-1 h-5 w-5"
                              />
                            ) : (
                              <ClipboardIcon
                                color="#359F89"
                                className="mr-2 h-5 w-5"
                              />
                            )
                          }
                          onRightIconClick={() => {
                            if (field.value) {
                              field.onChange("");
                            } else {
                              handlePasteClick(field);
                            }
                          }}
                          placeholder="Type in address"
                          className="py-3 h-12 text-sm rounded-lg placeholder:text-primary"
                          onFocusShowIcon={true}
                          onFocusText={true}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            validateAddress(e.target.value);
                          }}
                        />
                      </FormControl>
                      {form.formState.errors.address?.message ===
                      "wallet-format-error" ? (
                        <ErrorMessageWithIcon message="The wallet format is incorrect. Please make sure you are entering the correct wallet." />
                      ) : (
                        <FormMessage />
                      )}
                    </FormItem>
                  )}
                />
              </Form>
            </div>

            {/* Action Button */}
            {hasValidAddress && (
              <div className="pt-4">
                <Button onClick={handleManualAddressSubmit} className="w-full">
                  Save
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <WalletConnectDialog
        open={isWalletDialogOpen}
        onOpenChange={setIsWalletDialogOpen}
        walletOptions={dialogOptions}
        title="Connect your wallet"
        viewAllLink={false}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={options.title}
        description={options.description}
        actionText="Disconnect"
        onSubmit={() => {
          console.log("Disconnecting wallet...");
          disconnect();

          // Check if there's a pending address to use
          const pendingAddress = form.getValues("pendingAddress");

          form.setValue("address", "");
          form.setValue("pendingAddress", "");
          form.clearErrors();
          setCurrentConnectOption(WALLET_OPTIONS.TYPING);
          hideDialog();

          if (pendingAddress) {
            // Use the pending address after disconnect
            onWalletConnected(pendingAddress);
            onOpenChange(false);
          } else {
            // Just disconnect without new address
            onWalletConnected("");
          }
        }}
        onOpenChange={hideDialog}
      />
    </>
  );
};
