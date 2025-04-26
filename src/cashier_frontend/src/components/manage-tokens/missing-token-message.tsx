import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@/components/ui/link";

export function ManageTokensMissingTokenMessage() {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center mt-16">
            <div className="w-12 h-12 rounded-xl bg-lightgreen flex items-center justify-center mb-4">
                <Search className="stroke-green" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("manage.missing")}</h3>
            <p className="text-sm text-gray-500 text-center max-w-[250px] mb-4">
                You can add a token by clicking the + button above.
            </p>
        </div>
    );
}
