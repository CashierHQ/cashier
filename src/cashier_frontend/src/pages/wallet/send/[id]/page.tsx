import AssetButton from "@/components/asset-button";
import { AssetSelectItem } from "@/components/asset-select";
import ConfirmDialog from "@/components/confirm-dialog";
import { IconInput } from "@/components/icon-input";
import { SelectedAssetButtonInfo } from "@/components/link-details/selected-asset-button-info";
import { BackHeader } from "@/components/ui/back-header";
import { Spinner } from "@/components/ui/spinner";
import useTokenMetadata from "@/hooks/tokenUtilsHooks";
import { toast } from "@/hooks/use-toast";
import { useConfirmDialog } from "@/hooks/useDialog";
import { transformShortAddress } from "@/utils";
import { AccountIdentifier } from "@dfinity/ledger-icp";
import { useAuth } from "@nfid/identitykit/react";
import copy from "copy-to-clipboard";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaRegCopy } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";

function AccountIdContent({ accountId }: { accountId: string }) {
    const handleCopyAccountId = (e: React.SyntheticEvent) => {
        try {
            e.stopPropagation();
            copy(accountId ?? "");
            toast({
                description: "Copied",
            });
        } catch (err) {
            console.log("🚀 ~ handleCopyLink ~ err:", err);
        }
    };
    return (
        <>
            <div className="my-3">
                ICP uses two address formats, account id and principle id. Centralized exchanges use
                the account id, so we encourage you to use the account id to avoid sending or
                receiving to wallets that do not support principle ids.
            </div>
            <div>In case you'd like to use a Account ID, you can use the address below.</div>
            <div
                id="account-id-display"
                className="my-3 text-green flex items-center"
                style={{ wordBreak: "break-all" }}
                onClick={handleCopyAccountId}
            >
                <div
                    className="break-words overflow-hidden mr-2"
                    style={{ wordBreak: "break-all" }}
                >
                    {accountId}
                </div>
                <FaRegCopy color="green" size={32} />
            </div>
        </>
    );
}

export default function SendTokenPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const goBack = () => navigate("/wallet");
    const { tokenId } = useParams<{ tokenId: string }>();
    const { metadata, loading } = useTokenMetadata(tokenId);
    const { user } = useAuth();
    const { open, options, showDialog, hideDialog } = useConfirmDialog();
    const [accountId, setAccountId] = useState<string>("");

    const assetSelectedItem: AssetSelectItem = {
        name: metadata?.symbol || "",
        tokenAddress: tokenId ?? "",
        amount: undefined,
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
            toast({
                description: "Copied",
            });
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

    return (
        <div className="h-full overflow-auto px-4 py-2">
            <BackHeader onBack={goBack}>
                <h1 className="text-lg font-semibold">{t("wallet.receive.header")}</h1>
            </BackHeader>
            <div id="content" className="mx-2">
                <div className="mt-5">
                    <div id="warning-section" className="text-green flex items-center">
                        <Info className="text-green mr-1" />
                        <p>Send token to this wallet</p>
                    </div>
                </div>

                <div id="token-details" className="my-5">
                    <h2 className="font-medium leading-6 text-gray-900 mb-2">
                        {t("wallet.receive.receiveToken")}
                    </h2>
                    {loading ? (
                        <Spinner width={26} height={26} />
                    ) : (
                        <AssetButton
                            handleClick={() => console.log("test")}
                            text="Choose Asset"
                            childrenNode={
                                <SelectedAssetButtonInfo
                                    selectedToken={assetSelectedItem}
                                    isLoadingBalance={loading}
                                />
                            }
                        />
                    )}
                </div>

                <div id="address-detail" className="my-3">
                    <h2 className="font-medium leading-6 text-gray-900 mb-2">
                        Receive {metadata?.symbol} adrress
                    </h2>
                    <IconInput
                        isCurrencyInput={false}
                        placeholder={t("claim.addressPlaceholder")}
                        className="pl-3 py-5 h-14 text-md rounded-xl"
                        value={transformShortAddress(user?.principal?.toString() ?? "")}
                        disabled={true}
                        rightIcon={<FaRegCopy color="green" size={22} />}
                        onRightIconClick={handleCopy}
                    />
                </div>

                <div
                    id="account-id"
                    className="flex justify-center mt-4"
                    onClick={handleShowAccountId}
                >
                    <span className="text-green text-sm underline underline-offset-4">
                        {t("wallet.receive.useAccountId")}
                    </span>
                </div>

                <ConfirmDialog
                    open={open}
                    description={options.description}
                    onOpenChange={hideDialog}
                />
            </div>
        </div>
    );
}
