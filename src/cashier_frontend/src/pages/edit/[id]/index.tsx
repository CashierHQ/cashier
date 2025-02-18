import { useEffect } from "react";
import LinkTemplate from "./LinkTemplate";
import LinkDetails from "./LinkDetails";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { MultiStepForm } from "@/components/multi-step-form";
import { useTranslation } from "react-i18next";
import LinkPreview from "./LinkPreview";
import { useUpdateLinkSelfContained } from "@/hooks/linkHooks";
import TransactionToast from "@/components/transaction/transaction-toast";
import { LINK_STATE } from "@/services/types/enum";
import useToast from "@/hooks/useToast";
import { useLinkDataQuery } from "@/hooks/useLinkDataQuery";
import { useCreateLinkStore } from "@/stores/createLinkStore";
import { Spinner } from "@/components/ui/spinner";
import { useIdentity } from "@nfid/identitykit/react";
import { MultiStepFormContext } from "@/contexts/multistep-form-context";
import { cn } from "@/lib/utils";

const STEP_LINK_STATE_ORDER = [
    LINK_STATE.CHOOSE_TEMPLATE,
    LINK_STATE.ADD_ASSET,
    LINK_STATE.CREATE_LINK,
];

function getInitialStep(state: string | undefined) {
    return STEP_LINK_STATE_ORDER.findIndex((x) => x === state);
}

export default function LinkPage() {
    const navigate = useNavigate();
    const identity = useIdentity();

    const { t } = useTranslation();
    const { linkId } = useParams();
    const { toastData, hideToast } = useToast();

    const { link, setLink, action, setAction } = useCreateLinkStore();

    const { data: linkData, isFetching: isFetchingLinkData } = useLinkDataQuery(linkId);
    const { mutateAsync: updateLink } = useUpdateLinkSelfContained();

    useEffect(() => {
        if (linkData) {
            setLink(linkData.link);
            setAction(linkData.action);
        }
    }, [linkData]);

    const handleBackstep = async (context: MultiStepFormContext) => {
        if (context.step === 0 || action) {
            navigate("/");
        } else {
            updateLink({
                linkId: linkId!,
                linkModel: link!,
                isContinue: false,
            });
            context.prevStep();
        }
    };

    if (!linkId || !identity) {
        return <Navigate to={"/"} />;
    }

    if (isFetchingLinkData || getInitialStep(link?.state) < 0) {
        return (
            <div className="flex flex-col justify-center items-center w-full h-svh">
                <Spinner width={64} />
            </div>
        );
    }

    return (
        <div
            className={cn(
                "w-screen h-dvh max-h-dvh flex flex-col items-center py-3",
                "md:h-[90%] md:w-[40%] md:flex md:flex-col md:items-center md:py-5 md:bg-[white] md:rounded-md md:drop-shadow-md",
            )}
        >
            <div className="w-11/12 flex flex-col flex-grow sm:max-w-[400px] md:max-w-[100%]">
                <MultiStepForm initialStep={getInitialStep(link?.state)}>
                    <MultiStepForm.Header onClickBack={handleBackstep} />

                    <MultiStepForm.Items>
                        <MultiStepForm.Item name={t("create.linkTemplate")}>
                            <LinkTemplate />
                        </MultiStepForm.Item>

                        <MultiStepForm.Item name={t("create.linkDetails")}>
                            <LinkDetails />
                        </MultiStepForm.Item>

                        <MultiStepForm.Item name={t("create.linkPreview")}>
                            <LinkPreview />
                        </MultiStepForm.Item>
                    </MultiStepForm.Items>
                </MultiStepForm>

                <TransactionToast
                    open={toastData?.open ?? false}
                    onOpenChange={hideToast}
                    title={toastData?.title ?? ""}
                    description={toastData?.description ?? ""}
                    variant={toastData?.variant ?? "default"}
                />
            </div>
        </div>
    );
}
