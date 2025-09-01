// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React from "react";
import { cn } from "@/lib/utils";
import { LuWallet } from "react-icons/lu";
import { transformShortAddress } from "@/utils";

interface CustomConnectedWalletButtonProps {
  connectedAccount?: string;
  postfixText?: string;
  postfixIcon?: React.ReactNode;
  handleConnect: () => void;
  disabled?: boolean;
}

const CustomConnectedWalletButton: React.FC<
  CustomConnectedWalletButtonProps
> = ({
  connectedAccount,
  postfixText,
  postfixIcon,
  handleConnect,
  disabled,
}) => {
  return (
    <button
      className={cn(
        "w-full h-12 px-3",
        "bg-background text-foreground",
        "border border-input border-[#35A18B]",
        "hover:bg-accent hover:text-accent-foreground",
        "rounded-xl",
        "text-md",
        "ring-offset-background",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "flex items-center justify-start",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={(e) => {
        // Prevent form submission
        e.preventDefault();
        e.stopPropagation();
        console.log("Connected account:", connectedAccount);
        handleConnect();
      }}
      disabled={disabled}
    >
      <span className="flex items-center w-full">
        {postfixIcon ? (
          postfixIcon
        ) : (
          <LuWallet className="mr-2" color="#35A18B" size={22} />
        )}
        <span className="flex-grow text-left text-[14px]">
          {transformShortAddress(connectedAccount || "")}
        </span>{" "}
        {postfixText && (
          <span className="ml-auto text-[#35A18B] text-[14px]">
            {postfixText}
          </span>
        )}
      </span>
    </button>
  );
};

export default CustomConnectedWalletButton;
