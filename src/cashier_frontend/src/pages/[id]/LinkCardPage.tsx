import LinkCardWithoutPhoneFrame from "@/components/link-card-without-phone-frame";
import { useMultiStepFormContext } from "@/contexts/multistep-form-context";
import { LinkModel } from "@/services/types/link.service.types";
import { FC } from "react";

type LinkCardPageProps = {
    linkData?: LinkModel;
};

export const LinkCardPage: FC<LinkCardPageProps> = ({ linkData }) => {
    const { nextStep } = useMultiStepFormContext();

    return (
        <LinkCardWithoutPhoneFrame
            label="Claim"
            src="/icpLogo.png"
            message={linkData?.link.description ?? ""}
            title={linkData?.link.title ?? ""}
            onClaim={() => nextStep()}
            disabled={linkData === undefined}
        />
    );
};
