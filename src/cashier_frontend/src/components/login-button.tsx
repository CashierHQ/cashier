// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { cn } from "@/lib/utils";
import { ConnectWalletButton } from "@nfid/identitykit/react";
import React from "react";

interface ConnectWalletButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  children: React.ReactNode;
}

const LoginButton: React.FC<ConnectWalletButtonProps> = ({
  onClick,
  className,
  children,
}) => {
  return (
    <ConnectWalletButton
      onClick={onClick}
      className={cn(
        className,
        "min-w-[75px] min-h-[45px] font-500 bg-transparent light-borders-green text-green hover:bg-green/90 hover:text-white transition-all duration-300",
      )}
    >
      {children}
    </ConnectWalletButton>
  );
};

export default LoginButton;
