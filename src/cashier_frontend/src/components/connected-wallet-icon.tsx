// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
