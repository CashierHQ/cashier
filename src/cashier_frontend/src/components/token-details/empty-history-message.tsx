import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function EmptyHistoryMessage() {
    const { t } = useTranslation();

    return (
        <>
            <p className="font-medium mt-9">{t("history.list.noData")}</p>
            <div className="text-sm font-medium">
                <span>{t("history.list.cannotFind")}</span>{" "}
                <Link to="#" className="text-green">
                    {t("history.list.checkExplorer")}
                </Link>
            </div>
        </>
    );
}
