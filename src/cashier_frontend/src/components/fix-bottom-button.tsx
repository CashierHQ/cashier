// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "./ui/button";

interface FixedBottomButtonProps extends ButtonProps {
  customStyle?: string;
}

export const FixedBottomButton = React.forwardRef<
  HTMLButtonElement,
  FixedBottomButtonProps
>(({ className, customStyle, ...props }, ref) => {
  return (
    <div className="w-full flex-shrink-0 flex justify-center mt-auto">
      <Button
        className={cn(
          className,
          customStyle,
          "rounded-full w-full max-w-[350px] h-[44px] mx-4 text-center flex items-center justify-center",
        )}
        ref={ref}
        {...props}
      />
    </div>
  );
});

FixedBottomButton.displayName = "FixedBottomButton";
