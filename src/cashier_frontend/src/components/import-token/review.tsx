import { useTranslation } from "react-i18next";
import { AssetAvatar } from "../ui/asset-avatar";
import { Input } from "../ui/input";
import { Message } from "../ui/message";
import { Button } from "../ui/button";
import { mapChainToLogo, mapChainToPrettyName } from "@/utils/map/chain.map";
import { Label } from "../ui/label";
import { IconInput } from "../icon-input";
import { useTokens } from "@/hooks/useToken";
import { useIdentity } from "@nfid/identitykit/react";
import { AddTokenInput } from "../../../../declarations/token_storage/token_storage.did";
import { Principal } from "@dfinity/principal";

interface ImportTokenReviewProps {
    token: {
        name: string;
        symbol: string;
        logo?: string;
        chain: string;
        address: string;
        decimals: number;
    };
    // onImport?: (data: ImportTokenFormData) => void;
}

export function ImportTokenReview({ token }: ImportTokenReviewProps) {
    const { t } = useTranslation();

    const identity = useIdentity();
    const { addToken } = useTokens(identity);

    function handleImport() {
        const addTokenInput: AddTokenInput = {
            symbol: [token.symbol],
            chain: token.chain,
            decimals: [token.decimals],
            ledger_id: [Principal.fromText(token.address)],
            index_id: [Principal.fromText(token.address)],
            enabled: [true],
            unknown: [true],
        };

        addToken(addTokenInput);
    }

    return (
        <div className="flex flex-col flex-grow pt-6 pb-2 px-1">
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

                    <Message className="mt-3">{t("review.message")}</Message>
                </div>
            </div>

            <Button className="mt-2" onClick={handleImport} size="lg">
                {t("review.import")}
            </Button>
        </div>
    );
}
