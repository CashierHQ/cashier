import LinkCardWithoutPhoneFrame from "@/components/link-card-without-phone-frame";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { getTokenImage } from "@/utils";
import { FC } from "react";

type LinkCardPageProps = {
    linkData?: LinkDetailModel;
    onClickClaim?: () => void;
};

export const LinkCardPage: FC<LinkCardPageProps> = ({ linkData, onClickClaim }) => {
    return (
        <LinkCardWithoutPhoneFrame
            label="Claim"
            src={getTokenImage(linkData?.asset_info?.[0].address ?? "")}
            message={linkData?.description ?? ""}
            title={linkData?.title ?? ""}
            onClaim={onClickClaim}
            disabled={linkData === undefined}
        />
    );
};
