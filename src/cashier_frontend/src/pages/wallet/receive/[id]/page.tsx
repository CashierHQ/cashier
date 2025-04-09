import { IconInput } from "@/components/icon-input";
import ConfirmDialog from "@/components/confirm-dialog";
import { BackHeader } from "@/components/ui/back-header";
import { SelectToken } from "@/components/receive/SelectToken";
import useTokenMetadata from "@/hooks/tokenUtilsHooks";
import { toast } from "@/hooks/use-toast";
import { useConfirmDialog } from "@/hooks/useDialog";
import { transformShortAddress } from "@/utils";
import { AccountIdentifier } from "@dfinity/ledger-icp";
import { useAuth } from "@nfid/identitykit/react";
import copy from "copy-to-clipboard";
import { Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { AssetSelectItem } from "@/components/asset-select";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";
import { useResponsive } from "@/hooks/responsive-hook";
import { useTokens } from "@/hooks/useTokens";

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

export default function ReceiveTokenPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const responsive = useResponsive();
    const goBack = () => navigate("/wallet");
    const { tokenId } = useParams<{ tokenId?: string }>();
    const { metadata } = useTokenMetadata(tokenId);
    const { user } = useAuth();
    const { open, options, showDialog, hideDialog } = useConfirmDialog();
    const [accountId, setAccountId] = useState<string>("");
    const [currentSelectedToken, setCurrentSelectedToken] = useState<AssetSelectItem | undefined>(
        undefined,
    );

    const { filteredTokenList: tokenList } = useTokens();

    const selectedToken = useMemo(() => {
        // If no token list, return undefined
        if (!tokenList) return undefined;

        // If tokenId is provided, find that token or create a placeholder
        if (tokenId) {
            return tokenList.find((token) => token.address === tokenId);
        }

        // If no tokenId provided, return undefined instead of defaulting to first token
        return undefined;
    }, [tokenList, tokenId, metadata]);

    const handleTokenSelect = (token: AssetSelectItem) => {
        setCurrentSelectedToken(token);
        navigate(`/wallet/receive/${token.address}`);
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

    useEffect(() => {
        if (selectedToken) {
            setCurrentSelectedToken(selectedToken);
        }
    }, [selectedToken]);

    return (
        <div
            className={`flex flex-col ${responsive.isSmallDevice ? "px-2" : "max-w-[700px] mx-auto bg-white h-full p-4"}`}
        >
            <BackHeader onBack={goBack}>
                <h1 className="text-lg font-semibold">{t("wallet.receive.header")}</h1>
            </BackHeader>
            <div id="content" className="mx-2">
                <div className="mt-8">
                    <div id="warning-section" className="text-green flex place-items-start">
                        <Info className="text-green mr-2" size={22} />
                        <div className="w-fit text-[14px]">
                            {`Send ${currentSelectedToken?.name} to this wallet to begin using Cashier.`}{" "}
                            {`Ensure that you are only sending assets that are `}
                            <span className="font-bold">meant for this address</span>
                            {t("wallet.receive.receiveWarning3")}
                        </div>
                    </div>
                </div>

                <div id="token-details" className="my-5">
                    <Label>{t("wallet.receive.receiveToken")}</Label>
                    <SelectToken selectedToken={selectedToken} onSelect={handleTokenSelect} />
                </div>

                <div id="address-detail" className="my-3">
                    <Label>Receive {currentSelectedToken?.name} adress</Label>
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
            </div>
        </div>
    );
}
