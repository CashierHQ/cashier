// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { TransactionItem } from "@/components/transaction/transaction-item";
import { IntentModel, FeeModel } from "@/services/types/intent.service.types";
import { ACTION_TYPE, TASK } from "@/services/types/enum";
import { FeeHelpers } from "@/services/fee.service";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { useTokensV2 } from "@/hooks/token/useTokensV2";

type ConfirmationPopupAssetsSectionProps = {
  actionType: ACTION_TYPE;
  intents: IntentModel[];
  link: LinkDetailModel;
};

const getLabel = (intent: IntentModel) => {
  switch (intent.task) {
    case TASK.TRANSFER_WALLET_TO_LINK:
    case TASK.TRANSFER_WALLET_TO_TREASURY:
      return "confirmation_drawer.send_label";
    case TASK.TRANSFER_LINK_TO_WALLET:
      return "confirmation_drawer.receive_label";
    default:
      return "confirmation_drawer.send_label";
  }
};

// Sort intents by fee last, then by address
const sortIntentsByAddress = (intents: IntentModel[]): IntentModel[] => {
  return [...intents].sort((a, b) => {
    // First prioritize fees (TRANSFER_WALLET_TO_TREASURY) to show at the bottom
    const aIsFee = a.task === TASK.TRANSFER_WALLET_TO_TREASURY;
    const bIsFee = b.task === TASK.TRANSFER_WALLET_TO_TREASURY;

    if (aIsFee && !bIsFee) return 1; // Fee comes last (at the bottom)
    if (!aIsFee && bIsFee) return -1; // Non-fee comes first

    // If both are fees or both are not fees, then sort by address
    if (a.asset.address < b.asset.address) return -1;
    if (a.asset.address > b.asset.address) return 1;

    return 0;
  });
};

export const ConfirmationPopupAssetsSection: FC<
  ConfirmationPopupAssetsSectionProps
> = ({ link, actionType, intents }) => {
  const { t } = useTranslation();
  const { getToken } = useTokensV2();
  const [feesMap, setFeesMap] = useState<Map<string, FeeModel[]>>(new Map());
  const [sortedIntents, setSortedIntents] = useState<IntentModel[]>([]);

  // Sort intents and calculate fees
  useEffect(() => {
    // Sort intents by address with fees last
    setSortedIntents(sortIntentsByAddress(intents));

    const calculateFees = async () => {
      const newFeesMap = new Map<string, FeeModel[]>();

      console.log("intents", intents);
      // Process each intent to get associated fees
      for (const intent of intents) {
        const tokenAddress = intent.asset.address;
        const token = getToken(tokenAddress);

        if (!token) continue;

        // Get existing fees for this token or initialize empty array
        const tokenFees = newFeesMap.get(tokenAddress) || [];

        // Network fee for this token
        if (token.fee && intent.task !== TASK.TRANSFER_WALLET_TO_TREASURY) {
          tokenFees.push({
            chain: intent.asset.chain,
            type: "network_fee",
            address: tokenAddress,
            amount: token.fee,
          });
        }

        // Link creation fee if applicable
        if (intent.task === TASK.TRANSFER_WALLET_TO_TREASURY && link) {
          const linkCreationFee = FeeHelpers.getLinkCreationFee().amount;

          if (linkCreationFee) {
            tokenFees.push({
              chain: intent.asset.chain,
              type: "link_creation_fee",
              address: tokenAddress,
              amount: linkCreationFee,
            });
          }
        }

        if (tokenFees.length > 0) {
          newFeesMap.set(tokenAddress, tokenFees);
        }
      }

      setFeesMap(newFeesMap);
    };

    calculateFees();
  }, [intents, getToken, link]);

  return (
    <section id="confirmation-popup-section-send" className="my-3">
      <div className="flex items-center w-full justify-between">
        <h2 className="font-medium text-[14px] ml-2">
          {t(getLabel(intents[0]))}
        </h2>
      </div>

      <ol className="flex flex-col gap-3 light-borders-green px-4 py-3 overflow-y-auto max-h-[200px]">
        {sortedIntents.map((intent) => (
          <li key={intent.id}>
            <TransactionItem
              link={link}
              actionType={actionType}
              key={intent.id}
              intent={intent}
              fees={feesMap.get(intent.asset.address) || []}
            />
          </li>
        ))}
      </ol>
    </section>
  );
};
