import { cn } from "@/lib/utils";
import { ConnectWalletButton } from "@nfid/identitykit/react";
import React from "react";

interface ConnectWalletButtonProps {
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    className?: string;
    children: React.ReactNode;
}

const LoginButton: React.FC<ConnectWalletButtonProps> = ({ onClick, className, children }) => {
    return (
        <ConnectWalletButton
            onClick={onClick}
            className={cn(
                className,
                "min-w-[75px] min-h-[45px] font-500 bg-white border-[#E8F2EE] text-green shadow hover:bg-green/90 hover:text-white",
            )}
        >
            {children}
        </ConnectWalletButton>
    );
};

export default LoginButton;
