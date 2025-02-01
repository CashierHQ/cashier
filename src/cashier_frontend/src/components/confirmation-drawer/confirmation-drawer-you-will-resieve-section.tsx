import { FC } from "react";
import { useTranslation } from "react-i18next";

type ConfirmationPopupYouWillRecieveSection = {
    linkName: string | undefined;
};

export const ConfirmationPopupYouWillRecieveSection: FC<ConfirmationPopupYouWillRecieveSection> = ({
    linkName,
}) => {
    const { t } = useTranslation();

    return (
        <section id="confirmation-popup-section-receive" className="my-3">
            <h2 className="font-medium ml-2">{t("transaction.confirm_popup.receive_label")}</h2>

            <div className="flex justify-between border-solid border-inherit border-2 rounded-lg p-4">
                <div className="flex">
                    <img src="./smallLogo.svg" alt="Cashier logo" className="max-w-[20px]" />
                    <h3 className="ml-3">{t("transaction.confirm_popup.cashier_link_label")}</h3>
                </div>

                <span>{linkName}</span>
            </div>
        </section>
    );
};
