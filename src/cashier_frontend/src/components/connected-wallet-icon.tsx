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
import { Button } from "./ui/button";

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
            <ConnectWalletDropdownMenuButton>
                <Button variant="outline" size="icon" className="rounded-sm">
                    <LuWallet2 color="green" size={24} />
                </Button>
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
