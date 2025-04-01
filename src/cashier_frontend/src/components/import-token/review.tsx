import { useTranslation } from "react-i18next";
import { AssetAvatar } from "../ui/asset-avatar";
import { Input } from "../ui/input";
import { Message } from "../ui/message";
import { Button } from "../ui/button";
import { ImportTokenFormData } from "@/hooks/import-token.hooks";
import { mapChainToLogo, mapChainToPrettyName } from "@/utils/map/chain.map";
import { MOCK_TOKEN_DATA } from "@/constants/mock-data";
import { Label } from "../ui/label";
import { IconInput } from "../icon-input";

interface ImportTokenReviewProps {
    data: ImportTokenFormData;
    onImport?: (data: ImportTokenFormData) => void;
}

export function ImportTokenReview({ data, onImport = () => {} }: ImportTokenReviewProps) {
    const { t } = useTranslation();

    function handleImport() {
        onImport(data);
    }

    const token = MOCK_TOKEN_DATA;

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
