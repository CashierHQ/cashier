// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { FC } from "react";
import { Avatar } from "@/components/ui/avatar";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { ChevronDown } from "lucide-react";
import { AssetAvatarV2 } from "../ui/asset-avatar";

type SelectedAssetButtonInfoProps = {
  selectedToken?: FungibleToken | null;
  showInput?: boolean;
};

export const SelectedAssetButtonInfo: FC<SelectedAssetButtonInfoProps> = ({
  selectedToken,
  showInput = true,
}) => {
  if (!selectedToken) {
    return null;
  }

  return (
    <div className="flex font-normal flex-grow items-center w-fit">
      <Avatar className="mr-2 w-6 h-6">
        <AssetAvatarV2 token={selectedToken} />
      </Avatar>
      <div
        id="asset-info"
        className="text-left flex gap-3 w-full leading-none items-center"
      >
        <div className="text-[14px] font-normal">{selectedToken.name}</div>
        <ChevronDown
          color="#36A18B"
          strokeWidth={2}
          size={22}
          className={`${showInput ? "" : "ml-auto"}`}
        />
      </div>
    </div>
  );
};
