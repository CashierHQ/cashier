// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { LinkDetailModel } from "@/services/types/link.service.types";
import WalletOptionButton from "../wallet-connect/wallet-option-button";
import ConfirmDialog from "../confirm-dialog";
import { useConfirmDialog } from "@/hooks/useDialog";
import { Principal } from "@dfinity/principal";
import { useParams } from "react-router-dom";
import { ACTION_TYPE } from "@/services/types/enum";
import TokenItem from "./token-item";
import { useLinkDetailQuery } from "@/hooks/link-hooks";
import { useTokensV2 } from "@/hooks/token/useTokensV2";
import usePnpStore from "@/stores/plugAndPlayStore";

// This schema is used to validate the form input for the address field, only in case of anonymous user
export const UseSchema = z.object({
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
  const { open, options, hideDialog, showDialog } = useConfirmDialog();
  const { linkId } = useParams();
  const { disconnect, account } = usePnpStore();

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
    if (account) {
      console.log("User is authenticated");
      setDisabled(false);
      return;
    }

    console.log("User is not authenticated");

    // Otherwise, check if the address is valid
    const isValid = isAddressValid();
    setDisabled(!isValid);
  }, [account]);

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
            walletId={"iiSigner"}
            title="Internet Identity"
            // show disconnect dialog if user is already connected
            onClickConnectedWallet={() =>
              showDialog({
                title: t("wallet_connect_modal.disconnect_title", {
                  defaultValue: "Disconnect Wallet",
                }),
                description: t("wallet_connect_modal.disconnect_description", {
                  defaultValue:
                    "Are you sure you want to disconnect your wallet?",
                }),
              })
            }
          />
        </div>
      </div>

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
          hideDialog();
        }}
        onOpenChange={hideDialog}
      />
    </>
  );
};

export default UseLinkOptions;
