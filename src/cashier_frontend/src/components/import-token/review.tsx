import { useTranslation } from "react-i18next";
import { AssetAvatar } from "../ui/asset-avatar";
import { Input } from "../ui/input";
import { Message } from "../ui/message";
import { Button } from "../ui/button";
import { mapChainToLogo, mapChainToPrettyName } from "@/utils/map/chain.map";
import { Label } from "../ui/label";
import { IconInput } from "../icon-input";
import { AddTokenInput } from "../../../../declarations/token_storage/token_storage.did";
import { Principal } from "@dfinity/principal";
import { toNullable } from "@dfinity/utils";
import { useTokens } from "@/hooks/useTokens";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Spinner } from "../ui/spinner";

interface ImportTokenReviewProps {
    token: {
        name: string;
        symbol: string;
        logo?: string;
        chain: string;
        address: string;
        decimals: number;
        index_id?: string;
    };
}

export function ImportTokenReview({ token }: ImportTokenReviewProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { addToken } = useTokens();
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);

    async function handleImport() {
        setIsImporting(true);
        setImportError(null);

        try {
            const addTokenInput: AddTokenInput = {
                chain: token.chain,
                ledger_id: toNullable(Principal.fromText(token.address)),
                index_id: toNullable(
                    token.index_id ? Principal.fromText(token.index_id) : undefined,
                ),
            };

            await addToken(addTokenInput);
            navigate(-2);
        } catch (error) {
            console.error("Failed to import token:", error);
            setImportError(error instanceof Error ? error.message : "Failed to import token");
            setIsImporting(false);
        }
    }

    return (
        <div className="flex flex-col flex-grow relative pt-4 pb-2 px-1 h-full">
            {/* Loading Overlay */}
            {isImporting && (
                <div className="absolute inset-0 bg-white bg-opacity-80 z-50 flex items-center justify-center rounded-md">
                    <div className="flex flex-col items-center">
                        <Spinner width={40} height={40} />
                        <p className="mt-4 text-gray-700">
                            {t("review.importing", "Adding token to your wallet...")}
                        </p>
                    </div>
                </div>
            )}

            {importError && (
                <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">{importError}</div>
            )}

            <div className="flex flex-col gap-6 flex-grow">
                <div>
                    <Label>{t("review.token")}</Label>

                    <div className="flex mt-2.5 gap-4">
                        <AssetAvatar
                            className="w-12 h-12 ml-0"
                            src={token.logo}
                            symbol={token.symbol}
                        />
                        <div>
                            <p>{token.name}</p>
                            <p className="text-grey">{token.symbol}</p>
                        </div>
                    </div>
                </div>

                <div>
                    <Label>{t("import.form.chain.label")}</Label>

                    <div className="flex flex-col items-center gap-2">
                        <IconInput
                            isCurrencyInput={false}
                            placeholder={t("claim.addressPlaceholder")}
                            className="pl-3 py-5 text-md rounded-lg appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none shadow-xs border border-input"
                            value={mapChainToPrettyName(token.chain)}
                            disabled={true}
                            icon={
                                <AssetAvatar
                                    className="w-6 h-6"
                                    src={mapChainToLogo(token.chain)}
                                    symbol={token.chain}
                                />
                            }
                        />
                    </div>
                </div>

                <div>
                    <Label>{t("import.form.ledgerCanisterId.label")}</Label>

                    <Input
                        disabled
                        value={token.address}
                        className="pl-3 py-5 text-md rounded-lg appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none shadow-xs border border-input"
                    />

                    <Message className="mt-3 text-xs">{t("review.message")}</Message>
                </div>
            </div>

            <Button className="mt-auto" onClick={handleImport} size="lg" disabled={isImporting}>
                {t("review.import")}
            </Button>
        </div>
    );
}
