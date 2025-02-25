import { useTranslation } from "react-i18next";
import { BackHeader } from "../ui/back-header";
import { ImportTokenForm } from "./import-token-form";

export function ImportTokenPage() {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col h-full px-4 pt-2 pb-6">
            <BackHeader>
                <h1 className="text-lg font-semibold">{t("import.header")}</h1>
            </BackHeader>

            <ImportTokenForm />
        </div>
    );
}
