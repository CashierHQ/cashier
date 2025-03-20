import ClaimPageForm, { ClaimLinkDetail } from "@/components/claim-page/claim-page-form";
import { useMultiStepFormContext } from "@/contexts/multistep-form-context";
import { LinkDetailModel, LinkModel } from "@/services/types/link.service.types";
import { FC, useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { ClaimSchema } from ".";
import { z } from "zod";
import { useLinkUserState } from "@/hooks/linkUserHooks";
import { ACTION_TYPE } from "@/services/types/enum";
import { useParams } from "react-router-dom";
import { useIdentity } from "@nfid/identitykit/react";
import LinkService from "@/services/link.service";

type ClaimFormPageProps = {
    form: UseFormReturn<z.infer<typeof ClaimSchema>>;
    claimLinkDetails: ClaimLinkDetail;
    onSubmit: () => void;
    linkData?: LinkModel;
};

export const ClaimFormPage: FC<ClaimFormPageProps> = ({
    form,
    claimLinkDetails,
    onSubmit,
    linkData,
}) => {
    const { linkId } = useParams();
    const identity = useIdentity();
    const { prevStep } = useMultiStepFormContext();
    const [enableFetch, setEnableFetch] = useState(false);

    useEffect(() => {
        if (linkId && identity) {
            setEnableFetch(true);
        }
    }, [linkId, identity]);

    const { data: linkUserState, isFetching: isFetchingLinkUserState } = useLinkUserState(
        {
            action_type: ACTION_TYPE.CLAIM_LINK,
            link_id: linkId ?? "",
            create_if_not_exist: true,
            anonymous_wallet_address: "",
        },
        enableFetch,
    );

    return (
        <ClaimPageForm
            form={form}
            formData={linkData?.link ?? ({} as LinkDetailModel)}
            claimLinkDetails={[
                {
                    title: claimLinkDetails.title,
                    amount: claimLinkDetails.amount,
                },
            ]}
            onSubmit={onSubmit}
            onBack={prevStep}
        />
    );
};
