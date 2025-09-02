// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { useAuth, useIdentity } from "@nfid/identitykit/react";
import WalletOptionButton from "../wallet-connect/wallet-option-button";
import ConfirmDialog from "../confirm-dialog";
import { useConfirmDialog } from "@/hooks/useDialog";
import { Principal } from "@dfinity/principal";
import { useSignerStore } from "@/stores/signerStore";
import { useConnectToWallet } from "@/hooks/user-hook";
import { useParams } from "react-router-dom";
import { ACTION_TYPE } from "@/services/types/enum";
import TokenItem from "./token-item";
import { InternetIdentity } from "@nfid/identitykit";
import {
  WALLET_OPTIONS,
  GoogleSigner,
  LocalInternetIdentity,
} from "@/constants/wallet-options";
import { useLinkDetailQuery } from "@/hooks/link-hooks";
import { useTokensV2 } from "@/hooks/token/useTokensV2";
import { FEATURE_FLAGS } from "@/const";
import { WalletSelectionModal } from "../wallet-connect/wallet-selection-modal";
export const UseSchema = z.object({
  token: z.string().min(5),
  amount: z.coerce.number().min(1),
  address: z.string().optional(),
});

interface ClaimFormOptionsProps {
  form: UseFormReturn<z.infer<typeof UseSchema>>;
  formData?: LinkDetailModel;
  setDisabled: (disabled: boolean) => void;
  disabledInput?: boolean;
  onOpenWalletModal?: () => void;
}

const UseLinkOptions: React.FC<ClaimFormOptionsProps> = ({
  form,
  setDisabled,
}) => {
  const { t } = useTranslation();
  const { disconnect } = useAuth();
  const identity = useIdentity();
  const { open, options, hideDialog, showDialog } = useConfirmDialog();
  const { connectToWallet } = useConnectToWallet();
  const { setCurrentConnectOption } = useSignerStore();
  const { linkId } = useParams();
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);

  const linkDetailQuery = useLinkDetailQuery(linkId, ACTION_TYPE.USE);
  const link = linkDetailQuery.data?.link;
  const isLoading = linkDetailQuery.isLoading;

  const { updateTokenInit } = useTokensV2();

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

  useEffect(() => {
    updateTokenInit();
  }, []);

  useEffect(() => {
    // If user is authenticated, enable the form
    if (identity) {
      console.log("User is authenticated");
      setDisabled(false);
      return;
    }

    console.log("User is not authenticated");

    // Otherwise, check if the address is valid
    const isValid = isAddressValid();
    setDisabled(!isValid);
  }, [identity]);

  const checkForExistingWallet = (): boolean => {
    const hasAddress = (form.getValues("address") ?? "").trim().length > 0;
    if (hasAddress || identity) {
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

  // ...existing code... (wallet rendering handled by WalletOptionButton)

  const firstTilte = t(`claim_page.${link?.linkType}.choose_wallet.use_asset`);
  const secondTitle = t(
    `claim_page.${link?.linkType}.choose_wallet.wallet_options`,
  );

  return (
    <>
      <div id="asset-section" className="">
        <h2 className="text-[16px] font-medium mb-2">
          {firstTilte}
          {link?.asset_info && link?.asset_info?.length > 1 ? "s" : ""}
        </h2>
        <div className="light-borders-green px-4 py-3 flex flex-col gap-3">
          {link?.asset_info
            .sort((a, b) => {
              return (a.address ?? "").localeCompare(b.address ?? "");
            })
            .map((asset, index) => (
              <TokenItem
                key={index}
                asset={asset}
                link={link}
                isLoading={isLoading}
              />
            ))}
        </div>
      </div>

      <div className="mt-4">
        <h2 className="text-[16px] font-medium mb-2">{secondTitle}</h2>
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
      </div>

      <WalletSelectionModal
        open={isWalletDialogOpen}
        onOpenChange={setIsWalletDialogOpen}
        onWalletConnected={() => {
          setIsWalletDialogOpen(false);
        }}
      />

      <ConfirmDialog
        open={open}
        title={options.title}
        description={options.description}
        actionText="Disconnect"
        onSubmit={() => {
          console.log("Disconnecting wallet...");
          disconnect();
          form.setValue("address", "");
          form.clearErrors();
          setCurrentConnectOption(WALLET_OPTIONS.TYPING);
          hideDialog();
        }}
        onOpenChange={hideDialog}
      />
    </>
  );
};

export default UseLinkOptions;
