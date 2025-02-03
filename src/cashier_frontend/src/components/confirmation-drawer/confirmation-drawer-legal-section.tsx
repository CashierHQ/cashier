import { FC } from "react";
import { useTranslation } from "react-i18next";

export const ConfirmationPopupLegalSection: FC = () => {
    const { t } = useTranslation();

    return (
        <section id="confirmation-popup-section-legal-text" className="mb-3">
            <p>{t("transaction.confirm_popup.legal_text")}</p>
        </section>
    );
};
