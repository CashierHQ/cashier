import { Link, useNavigate } from "react-router-dom";
import { BackHeader } from "@/components/ui/back-header";
import { Search } from "@/components/ui/search";
import { ManageTokensList } from "@/components/manage-tokens/token-list";
import { ManageTokensMissingTokenMessage } from "@/components/manage-tokens/missing-token-message";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { MOCK_TOKENS_LIST } from "@/constants/mock-data";

export default function ManageTokensPage() {
    const { t } = useTranslation();

    const navigate = useNavigate();
    const goBack = () => navigate("/wallet");

    // TODO: add debouncing
    const [searchQuery, setSearchQuery] = useState<string>("");

    const tokens = useMemo(() => {
        return MOCK_TOKENS_LIST.filter((token) => {
            const lcSearchQuery = searchQuery.toLocaleLowerCase().trim();
            const lcName = token.name.toLocaleLowerCase();
            const lcSymbol = token.symbol.toLocaleLowerCase();

            return lcName.includes(lcSearchQuery) || lcSymbol.includes(lcSearchQuery);
        });
    }, [searchQuery]);
    const isNoTokens = tokens.length === 0;

    return (
        <div className="flex-grow overflow-auto px-4 py-2">
            <BackHeader onBack={goBack}>
                <h1 className="text-lg font-semibold">{t("manage.header")}</h1>
            </BackHeader>

            <Search.Root className="mt-6">
                <Search.Icon />
                <Search.Input
                    placeholder={t("manage.search.placeholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </Search.Root>

            <div className="flex flex-col py-6">
                {isNoTokens ? (
                    <ManageTokensMissingTokenMessage />
                ) : (
                    <ManageTokensList items={tokens} />
                )}

                <Link to="/wallet/import" className="text-green font-medium mx-auto mt-4">
                    + {t("manage.import")}
                </Link>
            </div>
        </div>
    );
}
