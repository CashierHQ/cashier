import LinkCardWithoutPhoneFrame from "@/components/link-card-without-phone-frame";
import { LinkModel } from "@/services/types/link.service.types";
import { FC } from "react";

type LinkCardPageProps = {
    linkData?: LinkModel;
    onClickClaim?: () => void;
};

export const LinkCardPage: FC<LinkCardPageProps> = ({ linkData, onClickClaim }) => {
    return (
        <LinkCardWithoutPhoneFrame
            label="Claim"
            src="/icpLogo.png"
            message={linkData?.link.description ?? ""}
            title={linkData?.link.title ?? ""}
            onClaim={onClickClaim}
            disabled={linkData === undefined}
        />
    );
};
