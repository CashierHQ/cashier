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

import { IconInput } from "@/components/icon-input";
import ConfirmDialog from "@/components/confirm-dialog";
import useTokenMetadata from "@/hooks/tokenUtilsHooks";
import useToast from "@/hooks/useToast";
import { useConfirmDialog } from "@/hooks/useDialog";
import { transformShortAddress } from "@/utils";
import { AccountIdentifier } from "@dfinity/ledger-icp";
import { useAuth } from "@nfid/identitykit/react";
import copy from "copy-to-clipboard";
import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";
import { useTokens } from "@/hooks/useTokens";
import AssetButton from "@/components/asset-button";
import { SelectedAssetButtonInfo } from "@/components/link-details/selected-asset-button-info";
import AssetDrawer from "@/components/asset-drawer";
import { FungibleToken } from "@/types/fungible-token.speculative";
import TransactionToast from "@/components/transaction/transaction-toast";
import { useWalletContext } from "@/contexts/wallet-context";

function AccountIdContent({ accountId }: { accountId: string }) {
    const { showToast, hideToast } = useToast();

    const handleCopyAccountId = (e: React.SyntheticEvent) => {
        try {
            e.stopPropagation();
            copy(accountId ?? "");
            showToast("Copied", "", "default");
        } catch (err) {
            console.log("🚀 ~ handleCopyLink ~ err:", err);
        }
    };
    return (
        <>
            <div className="text-[14px]">
                ICP uses two address formats, Account Id and Principal Id. Centralized exchanges use
                the Account Id, so we encourage you to use the account id to avoid sending or
                receiving to wallets that do not support Principal Ids.
            </div>
            <div className="text-[14px] mt-4">
                In case you'd like to use a Account ID, you can use the address below.
            </div>
            <div
                id="account-id-display"
                className="mt-6 text-green flex items-start"
                style={{ wordBreak: "break-all" }}
                onClick={handleCopyAccountId}
            >
                <div
                    className="break-words text-[14px] overflow-hidden mr-2"
                    style={{ wordBreak: "break-all" }}
                >
                    {accountId}
                </div>
                <Copy className="text-green h-fit" size={36} />
            </div>
        </>
    );
}

interface ReceivePanelProps {
    tokenId?: string;
    onBack: () => void;
}

const ReceivePanel: React.FC<ReceivePanelProps> = ({ tokenId, onBack }) => {
    const { t } = useTranslation();
    const { metadata } = useTokenMetadata(tokenId);
    const { user } = useAuth();
    const { open, options, showDialog, hideDialog } = useConfirmDialog();
    const { toastData, showToast, hideToast } = useToast();
    const [accountId, setAccountId] = useState<string>("");
    const [currentSelectedToken, setCurrentSelectedToken] = useState<FungibleToken | undefined>(
        undefined,
    );
    const [showAssetDrawer, setShowAssetDrawer] = useState(false);
    const { navigateToPanel } = useWalletContext();

    const { getDisplayTokens } = useTokens();
    const tokenList = getDisplayTokens();

    const selectedToken = useMemo(() => {
        // If no token list, return undefined
        if (!tokenList) return undefined;

        // If tokenId is provided, find that token or create a placeholder
        if (tokenId) {
            return tokenList.find((token) => token.address === tokenId);
        }

        // If no tokenId provided, default to ICP
        return tokenList.find((token) => token.address === "ryjl3-tyaaa-aaaaa-aaaba-cai");
    }, [tokenList, tokenId, metadata]);

    const handleTokenSelect = (token: FungibleToken) => {
        setCurrentSelectedToken(token);
        navigateToPanel("receive", { tokenId: token.address });
        setShowAssetDrawer(false);
    };

    const handleShowAccountId = () => {
        showDialog({
            title: "Account ID",
            description: <AccountIdContent accountId={accountId} />,
        });
    };

    const handleCopy = (e: React.SyntheticEvent) => {
        try {
            e.stopPropagation();
            copy(user?.principal.toString() ?? "");
            showToast("Copied", "", "default");
        } catch (err) {
            console.log("🚀 ~ handleCopyLink ~ err:", err);
        }
    };

    useEffect(() => {
        if (user?.principal) {
            const account = AccountIdentifier.fromPrincipal({
                principal: user.principal,
            });
            if (account) {
                setAccountId(account.toHex());
            }
        }
    }, [user]);

    useEffect(() => {
        if (selectedToken) {
            setCurrentSelectedToken(selectedToken);
        }
    }, [selectedToken]);

    return (
        <div className="w-full flex flex-col h-full">
            <div className="relative flex justify-center items-center mb-4">
                <button onClick={onBack} className="absolute left-0">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-lg font-semibold">{t("wallet.receive.header")}</h1>
            </div>

            <div id="content" className="h-full">
                <div id="token-details" className="mb-5">
                    <Label>{t("wallet.receive.receiveToken")}</Label>
                    <AssetButton
                        handleClick={() => setShowAssetDrawer(true)}
                        text="Select Token"
                        childrenNode={
                            selectedToken && (
                                <SelectedAssetButtonInfo
                                    selectedToken={selectedToken}
                                    showInput={false}
                                />
                            )
                        }
                        showInput={false}
                    />
                </div>

                <div id="address-detail" className="my-3">
                    <Label>Receive address</Label>
                    <IconInput
                        isCurrencyInput={false}
                        placeholder={t("claim.addressPlaceholder")}
                        className="pl-3 py-5 text-md rounded-lg appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none shadow-xs border border-input"
                        value={transformShortAddress(user?.principal?.toString() ?? "")}
                        disabled={true}
                        rightIcon={<Copy color="#36A18B" size={18} />}
                        onRightIconClick={handleCopy}
                    />
                </div>

                {currentSelectedToken?.address === "ryjl3-tyaaa-aaaaa-aaaba-cai" && (
                    <div
                        id="account-id"
                        className="flex justify-center mt-4"
                        onClick={handleShowAccountId}
                    >
                        <span className="text-green text-sm underline underline-offset-4">
                            {t("wallet.receive.useAccountId")}
                        </span>
                    </div>
                )}

                <ConfirmDialog
                    open={open}
                    description={options.description}
                    onOpenChange={hideDialog}
                />

                {/* Asset Selection Drawer */}
                <AssetDrawer
                    title="Select Token"
                    open={showAssetDrawer}
                    handleClose={() => setShowAssetDrawer(false)}
                    handleChange={(address) => {
                        const token = tokenList?.find((t) => t.address === address);
                        if (token) {
                            handleTokenSelect(token);
                        }
                    }}
                    assetList={tokenList || []}
                    showSearch={true}
                />
            </div>
            <TransactionToast
                open={toastData?.open ?? false}
                onOpenChange={hideToast}
                title={toastData?.title ?? ""}
                description={toastData?.description ?? ""}
                variant={toastData?.variant ?? "default"}
                duration={2000}
            />
        </div>
    );
};

export default ReceivePanel;
