import { useTranslation } from "react-i18next";
import { BackHeader } from "../ui/back-header";
import { ImportTokenForm } from "./import-token-form";
import { useState } from "react";
import { ImportTokenFormData } from "@/hooks/import-token.hooks";
import { ImportTokenReview } from "./import-token-review";
import { useNavigate } from "react-router-dom";

export function ImportTokenPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [importData, setImportData] = useState<ImportTokenFormData>();

    function goToDetails(data: ImportTokenFormData) {
        navigate(`/wallet/details/${data.ledgerCanisterId}`);
    }

    function goBack() {
        if (importData) {
            setImportData(undefined);
        } else {
            navigate("..");
        }
    }

    return (
        <div className="flex flex-col h-full px-4 pt-2 pb-6">
            <BackHeader onBack={goBack}>
                <h1 className="text-lg font-semibold">
                    {t(importData ? "review.header" : "import.header")}
                </h1>
            </BackHeader>

            {importData ? (
                <ImportTokenReview data={importData} onImport={goToDetails} />
            ) : (
                <ImportTokenForm onSubmit={setImportData} />
            )}
        </div>
    );
}
