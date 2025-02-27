import { Link, useNavigate } from "react-router-dom";
import { BackHeader } from "@/components/ui/back-header";
import { Search } from "@/components/ui/search";
import { ManageTokensList } from "@/components/manage-tokens/token-list";
import { ManageTokensMissingTokenMessage } from "@/components/manage-tokens/missing-token-message";
import { useTranslation } from "react-i18next";

export default function ManageTokensPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const goBack = () => navigate("/wallet");

    const isNoTokens = false;

    return (
        <div className="flex-grow overflow-auto px-4 py-2">
            <BackHeader onBack={goBack}>
                <h1 className="text-lg font-semibold">{t("manage.header")}</h1>
            </BackHeader>

            <Search.Root className="mt-6">
                <Search.Icon />
                <Search.Input placeholder={t("manage.search.placeholder")} />
            </Search.Root>

            <div className="flex flex-col py-6">
                {isNoTokens ? <ManageTokensMissingTokenMessage /> : <ManageTokensList />}

                <Link to="/wallet/import" className="text-green font-medium mx-auto mt-4">
                    + {t("manage.import")}
                </Link>
            </div>
        </div>
    );
}
