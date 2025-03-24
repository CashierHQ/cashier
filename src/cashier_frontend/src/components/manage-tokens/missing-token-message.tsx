import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ManageTokensMissingTokenMessage() {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center mx-auto mt-10">
            <div className="flex justify-center items-center w-12 h-12 rounded-lg border border-lightgreen">
                <Search className="stroke-green" size={24} />
            </div>
            <h3 className="font-medium whitespace-nowrap mt-4">{t("manage.missing")}</h3>
        </div>
    );
}
