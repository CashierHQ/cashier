import { useEffect } from "react";
import LinkTemplate from "./LinkTemplate";
import LinkDetails from "./LinkDetails";
import { Navigate, useParams } from "react-router-dom";
import MultiStepForm from "@/components/multi-step-form";
import { useTranslation } from "react-i18next";
import LinkPreview from "./LinkPreview";
import { useUpdateLink } from "@/hooks/linkHooks";
import TransactionToast from "@/components/transaction/transaction-toast";
import { useResponsive } from "@/hooks/responsive-hook";
import { LINK_STATE } from "@/services/types/enum";
import useToast from "@/hooks/useToast";
import { useLinkDataQuery } from "@/hooks/useLinkDataQuery";
import { useCreateLinkStore } from "@/stores/createLinkStore";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const STEP_LINK_STATE_ORDER = [
    LINK_STATE.CHOOSE_TEMPLATE,
    LINK_STATE.ADD_ASSET,
    LINK_STATE.CREATE_LINK,
];

function getInitialStep(state: string) {
    return STEP_LINK_STATE_ORDER.findIndex((x) => x === state) ?? 0;
}

export default function LinkPage() {
    const { t } = useTranslation();
    const { linkId } = useParams();
    const { toastData, hideToast } = useToast();

    const { link, setLink, setAction } = useCreateLinkStore();

    const { data: linkData, isLoading: isLoadingLinkData } = useLinkDataQuery(linkId);
    const { mutateAsync: updateLink } = useUpdateLink();

    useEffect(() => {
        if (linkData) {
            setLink(linkData.link);
            setAction(linkData.action);
        }
    }, [linkData]);

    const handleBackstep = async () => {
        await updateLink({
            linkId: linkId!,
            linkModel: link!,
            isContinue: false,
        });
    };

    if (!linkId) {
        return <Navigate to={"/"} />;
    }

    if (isLoadingLinkData) {
        return (
            <div className="flex flex-col justify-center items-center w-full f-svh">
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
                <MultiStepForm initialStep={0}>
                    <MultiStepForm.Header onClickBack={handleBackstep} />

                    <MultiStepForm.Item name={t("create.linkTemplate")}>
                        <LinkTemplate />
                    </MultiStepForm.Item>

                    <MultiStepForm.Item name={t("create.linkDetails")}>
                        <LinkDetails />
                    </MultiStepForm.Item>

                    <MultiStepForm.Item name={t("create.linkPreview")}>
                        <LinkPreview />
                    </MultiStepForm.Item>
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
