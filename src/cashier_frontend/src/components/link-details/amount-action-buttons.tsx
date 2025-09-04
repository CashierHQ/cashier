// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface AmountActionButtonData {
  content?: ReactNode;
  action: () => void;
}

interface AmountActionButtons {
  data: AmountActionButtonData[];
  isDisabled?: boolean;
}

export function AmountActionButtons({ data, isDisabled }: AmountActionButtons) {
  return (
    <div className="flex justify-between w-full mx-auto gap-2">
      {data.map(({ content, action }, index) => (
        <Button
          key={index}
          type="button"
          variant="outline"
          size="icon"
          className={`asset-amount-percentage-button focus:border-green focus:text-green focus:bg-white`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Button clicked");
            action();
          }}
          disabled={isDisabled}
        >
          {content}
        </Button>
      ))}
    </div>
  );
}
