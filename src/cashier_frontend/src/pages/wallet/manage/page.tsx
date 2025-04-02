import { useNavigate } from "react-router-dom";
import { BackHeader } from "@/components/ui/back-header";
import { Search } from "@/components/ui/search";
import { ManageTokensList } from "@/components/manage-tokens/token-list";
import { ManageTokensMissingTokenMessage } from "@/components/manage-tokens/missing-token-message";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Link } from "@/components/ui/link";
import { useResponsive } from "@/hooks/responsive-hook";
import { useTokens } from "@/hooks/useToken";
import { useIdentity } from "@nfid/identitykit/react";

export default function ManageTokensPage() {
    const { t } = useTranslation();
    const responsive = useResponsive();

    const navigate = useNavigate();
    const goBack = () => navigate("/wallet");
    const identity = useIdentity();

    const { tokens } = useTokens(identity, { refetchInterval: 30000, enabled: true });

    // TODO: add debouncing
    const [searchQuery, setSearchQuery] = useState<string>("");

    const isNoTokens = tokens.length === 0;

    return (
        <div
            className={`flex flex-col ${responsive.isSmallDevice ? "px-2 py-4 h-full" : "max-w-[700px] mx-auto bg-white max-h-[80%] mt-12 rounded-xl shadow-sm p-4"}`}
        >
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

                <Link to="/wallet/import" className="mx-auto mt-4">
                    + {t("manage.import")}
                </Link>
            </div>
        </div>
    );
}
