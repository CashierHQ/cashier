import { FC } from "react";
import { useTranslation } from "react-i18next";

export const ConfirmationPopupLegalSection: FC = () => {
    const { t } = useTranslation();

    return (
        <section id="confirmation-popup-section-legal-text" className="mb-3 ml-2 mt-2">
            <p className="text-[14px] font-normal">{t("transaction.confirm_popup.legal_text")}</p>
        </section>
    );
};
