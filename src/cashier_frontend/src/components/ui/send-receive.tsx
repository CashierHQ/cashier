// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { ArrowUp, ArrowDown, ArrowDownUp } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SendReceiveProps {
  onSend?: () => void;
  onReceive?: () => void;
  onSwap?: () => void;
}

export function SendReceive({
  onSend = () => {},
  onReceive = () => {},
  onSwap, // Make this optional with no default - we'll check if it exists to conditionally render
}: SendReceiveProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-6 mt-4">
      <button className="flex flex-col items-center w-14" onClick={onSend}>
        <div className="bg-lightgreen rounded-full p-2.5">
          <ArrowUp size={18} />
        </div>

        <span className="text-xs text-lightgrey mt-1">
          {t("wallet.details.send")}
        </span>
      </button>

      <button className="flex flex-col items-center w-14" onClick={onReceive}>
        <div className="bg-lightgreen rounded-full p-2.5">
          <ArrowDown size={18} />
        </div>

        <span className="text-xs text-lightgrey mt-1">
          {t("wallet.details.receive")}
        </span>
      </button>

      {onSwap && (
        <button className="flex flex-col items-center w-14" onClick={onSwap}>
          <div className="bg-lightgreen rounded-full p-2.5">
            <ArrowDownUp size={18} />
          </div>

          <span className="text-xs text-lightgrey mt-1">
            {t("wallet.details.swap")}
          </span>
        </button>
      )}
    </div>
  );
}
