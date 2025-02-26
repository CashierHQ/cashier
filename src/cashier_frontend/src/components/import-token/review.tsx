import { useTranslation } from "react-i18next";
import { AssetAvatar } from "../ui/asset-avatar";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { Input } from "../ui/input";
import { Message } from "../ui/message";
import { Button } from "../ui/button";
import { Chain } from "@/services/types/link.service.types";
import { ImportTokenFormData } from "@/hooks/import-token.hooks";

interface ImportTokenReviewProps {
    data: ImportTokenFormData;
    onImport?: (data: ImportTokenFormData) => void;
}

export function ImportTokenReview({ data, onImport = () => {} }: ImportTokenReviewProps) {
    const { t } = useTranslation();

    function handleImport() {
        onImport(data);
    }

    return (
        <div className="flex flex-col flex-grow pt-6 pb-2">
            <div className="flex flex-col gap-6 flex-grow">
                <div>
                    <h2 className="font-semibold">{t("review.token")}</h2>

                    <div className="flex mt-2.5 gap-4">
                        <AssetAvatar
                            className="w-12 h-12 ml-0"
                            src={`${IC_EXPLORER_IMAGES_PATH}mxzaz-hqaaa-aaaar-qaada-cai`}
                            symbol="ckBTC"
                        />
                        <div>
                            <p>Kinic</p>
                            <p className="text-grey">KINIC</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="font-semibold">{t("import.form.chain.label")}</h2>

                    <div className="relative mt-2.5">
                        <Input
                            disabled
                            value="Internet Computer"
                            className="pl-12 disabled:opacity-100"
                        />
                        <AssetAvatar
                            className="w-6 h-6 absolute top-1/2 -translate-y-1/2"
                            src={`${IC_EXPLORER_IMAGES_PATH}ryjl3-tyaaa-aaaaa-aaaba-cai`}
                            symbol={Chain.IC}
                        />
                    </div>
                </div>

                <div>
                    <h2 className="font-semibold">{t("import.form.ledgerCanisterId.label")}</h2>

                    <Input
                        disabled
                        value="73mez-iiaaa-aaaaq-aaasq-cai"
                        className="mt-2.5 disabled:opacity-100"
                    />

                    <Message className="mt-2.5">{t("review.message")}</Message>
                </div>
            </div>

            <Button onClick={handleImport}>{t("review.import")}</Button>
        </div>
    );
}
