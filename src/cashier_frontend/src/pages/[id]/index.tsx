import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import LinkService from "@/services/link.service";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import LinkCardWithoutPhoneFrame from "@/components/link-card-without-phone-frame";
import { LinkDetailModel } from "@/services/types/link.service.types";
import ClaimPageForm from "@/components/claim-page/claim-page-form";
import TransactionToast from "@/components/transaction/transaction-toast";
import { ACTION_TYPE } from "@/services/types/enum";
import useToast from "@/hooks/useToast";
import Header from "@/components/header";
import useConnectToWallet from "@/hooks/useConnectToWallet";
import SheetWrapper from "@/components/sheet-wrapper";
import useTokenMetadata from "@/hooks/tokenUtilsHooks";
import { TokenUtilService } from "@/services/tokenUtils.service";

export const ClaimSchema = z.object({
    token: z.string().min(5),
    amount: z.coerce.number().min(1),
    address: z.string().optional(),
});

export default function ClaimPage() {
    const [formData, setFormData] = useState<LinkDetailModel>({} as LinkDetailModel);
    const { linkId } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const { toastData, showToast, hideToast } = useToast();
    const { connectToWallet } = useConnectToWallet();
    const [claimStatus, setClaimStatus] = useState("Claim");

    const form = useForm<z.infer<typeof ClaimSchema>>({
        resolver: zodResolver(ClaimSchema),
    });

    const { metadata } = useTokenMetadata(formData?.asset_info?.[0].address);

    // Watch form values to trigger re-render
    const watchedToken = form.watch("token");
    const watchedAmount = form.watch("amount");

    useEffect(() => {
        if (!linkId) return;
        const fetchData = async () => {
            const linkObj = await new LinkService().getLink(linkId, ACTION_TYPE.CREATE_LINK);
            const link = linkObj.link;
            setFormData(link);
            form.setValue("token", link.title);
            setIsLoading(false);
        };
        fetchData();
    }, [linkId]);

    useEffect(() => {
        if (!metadata) return;
        form.setValue(
            "amount",
            TokenUtilService.getHumanReadableAmountFromMetadata(
                formData?.asset_info?.[0].amount,
                metadata,
            ),
        );
    }, [formData, metadata]);

    if (isLoading) return null;

    const handleClaim = async () => {
        setClaimStatus("Claimed");
        // if (!form.getValues("address") || form.getValues("address")?.length == 0) {
        //     showToast("Test", "To receive, you need to login or connect your wallet", "error");
        //     return;
        // }
        // console.log("Claiming");
    };

    const handleStartClaimClick = () => {
        setClaimStatus("Claiming");
    };

    return (
        <div className="w-screen h-screen flex flex-col items-center py-5">
            <SheetWrapper>
                <div className="w-11/12 max-w-[400px]">
                    <Header onConnect={connectToWallet} openTestForm={connectToWallet} />

                    {claimStatus === "Claiming" ? (
                        <ClaimPageForm
                            form={form}
                            formData={formData}
                            claimLinkDetails={[
                                {
                                    title: watchedToken,
                                    amount: watchedAmount,
                                },
                            ]}
                            handleClaim={handleClaim}
                            setIsClaiming={() => setClaimStatus("Claim")}
                        />
                    ) : claimStatus === "Claimed" ? (
                        <LinkCardWithoutPhoneFrame
                            label="Claimed"
                            src="/icpLogo.png"
                            message={formData.description}
                            title={formData.title}
                            disabled={true}
                        />
                    ) : (
                        <LinkCardWithoutPhoneFrame
                            label="Claim"
                            src="/icpLogo.png"
                            message={formData.description}
                            title={formData.title}
                            onClaim={handleStartClaimClick}
                        />
                    )}
                </div>

                <TransactionToast
                    open={toastData?.open ?? false}
                    onOpenChange={hideToast}
                    title={toastData?.title ?? ""}
                    description={toastData?.description ?? ""}
                    variant={toastData?.variant ?? "default"}
                />
            </SheetWrapper>
        </div>
    );
}
