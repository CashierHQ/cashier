// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import {
    ConnectWalletDropdownMenu,
    ConnectWalletDropdownMenuButton,
    ConnectWalletDropdownMenuProps,
    ConnectWalletDropdownMenuDisconnectItem,
    ConnectWalletDropdownMenuItems,
    ConnectWalletDropdownMenuAddressItem,
} from "@nfid/identitykit/react";
import { LuWallet2 } from "react-icons/lu";
import copy from "copy-to-clipboard";
import { buttonVariants } from "./ui/button";

interface ExtendedConnectWalletDropdownMenuProps extends ConnectWalletDropdownMenuProps {
    connectedAccount: string;
    disconnect: () => void;
}

function ConnectedWalletDropdownIcon({
    connectedAccount,
    disconnect,
}: ExtendedConnectWalletDropdownMenuProps) {
    const handleCopy = (e: React.SyntheticEvent) => {
        try {
            e.stopPropagation();
            copy(connectedAccount);
        } catch (err) {
            console.log("🚀 ~ handleCopyLink ~ err:", err);
        }
    };

    return (
        <ConnectWalletDropdownMenu>
            <ConnectWalletDropdownMenuButton
                className={buttonVariants({
                    variant: "outline",
                    size: "icon",
                    className: "rounded-sm",
                })}
            >
                <LuWallet2 color="green" size={24} />
            </ConnectWalletDropdownMenuButton>
            <ConnectWalletDropdownMenuItems>
                <ConnectWalletDropdownMenuAddressItem
                    value={connectedAccount}
                    onClick={handleCopy}
                />
                <ConnectWalletDropdownMenuDisconnectItem onClick={disconnect} />
            </ConnectWalletDropdownMenuItems>
        </ConnectWalletDropdownMenu>
    );
}

export default ConnectedWalletDropdownIcon;
