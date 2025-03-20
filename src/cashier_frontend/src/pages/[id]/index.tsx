import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import LinkCardWithoutPhoneFrame from "@/components/link-card-without-phone-frame";
import ClaimPageForm from "@/components/claim-page/claim-page-form";
import TransactionToast from "@/components/transaction/transaction-toast";
import { ACTION_TYPE } from "@/services/types/enum";
import useToast from "@/hooks/useToast";
import Header from "@/components/header";
import useConnectToWallet from "@/hooks/useConnectToWallet";
import SheetWrapper from "@/components/sheet-wrapper";
import useTokenMetadata from "@/hooks/tokenUtilsHooks";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { useLinkDataQuery } from "@/hooks/useLinkDataQuery";
import { useLinkUserState, useUpdateLinkUserState } from "@/hooks/linkUserHooks";
import { useIdentity } from "@nfid/identitykit/react";

export const ClaimSchema = z.object({
    token: z.string().min(5),
    amount: z.coerce.number().min(1),
    address: z.string().optional(),
});

export default function ClaimPage() {
    const [enableFetchLinkUserState, setEnableFetchLinkUserState] = useState(false);
    const { linkId } = useParams();
    const identity = useIdentity();
    const updateLinkUserState = useUpdateLinkUserState();
    const { data: linkData, isFetching: isFetchingLinkData } = useLinkDataQuery(linkId);

    const { data: linkUserState, isFetching: isFetchingLinkUserState } = useLinkUserState(
        {
            action_type: ACTION_TYPE.CLAIM_LINK,
            link_id: linkId ?? "",
            create_if_not_exist: false,
            anonymous_wallet_address: "",
        },
        enableFetchLinkUserState,
    );

    const [isLoading, setIsLoading] = useState(true);
    const { toastData, showToast, hideToast } = useToast();
    const { connectToWallet } = useConnectToWallet();
    const [claimStatus, setClaimStatus] = useState("Claim");

    const form = useForm<z.infer<typeof ClaimSchema>>({
        resolver: zodResolver(ClaimSchema),
    });

    const { metadata } = useTokenMetadata(linkData?.link.asset_info?.[0].address);

    const handleClaim = async () => {
        setClaimStatus("Claimed");
        // if (!form.getValues("address") || form.getValues("address")?.length == 0) {
        //     showToast("Test", "To receive, you need to login or connect your wallet", "error");
        //     return;
        // }
        // console.log("Claiming");
    };

    const handleStartClaimClick = () => {
        updateLinkUserState.mutate({
            input: {
                link_id: linkId ?? "",
                action_type: ACTION_TYPE.CLAIM_LINK,
                isContinue: true,
            },
        });
        setClaimStatus("Claiming");
    };

    const handleConnectWallet = (e: React.MouseEvent<HTMLButtonElement>) => {
        connectToWallet(e);
        setEnableFetchLinkUserState(true);
    };

    // Watch form values to trigger re-render
    const watchedToken = form.watch("token");
    const watchedAmount = form.watch("amount");

    useEffect(() => {
        if (linkData) {
            form.setValue("token", linkData.link.title);
            setIsLoading(false);
        }
        if (linkData && identity) {
            setEnableFetchLinkUserState(true);
        }
    }, [linkData, identity]);

    useEffect(() => {
        setIsLoading(isFetchingLinkData);
    }, [isFetchingLinkData]);

    useEffect(() => {
        if (!metadata) return;
        form.setValue(
            "amount",
            TokenUtilService.getHumanReadableAmountFromMetadata(
                linkData?.link.asset_info?.[0].amount ?? BigInt(0),
                metadata,
            ),
        );
    }, [linkData, metadata]);

    if (isLoading) return null;

    return (
        <div className="w-screen h-screen flex flex-col items-center py-5">
            <SheetWrapper>
                <div className="w-11/12 max-w-[400px]">
                    <Header onConnect={handleConnectWallet} openTestForm={connectToWallet} />

                    {claimStatus === "Claiming" && linkData ? (
                        <ClaimPageForm
                            form={form}
                            formData={linkData?.link}
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
                            message={linkData?.link.description ?? ""}
                            title={linkData?.link.title ?? ""}
                            disabled={true}
                        />
                    ) : (
                        <LinkCardWithoutPhoneFrame
                            label="Claim"
                            src="/icpLogo.png"
                            message={linkData?.link.description ?? ""}
                            title={linkData?.link.title ?? ""}
                            onClaim={handleStartClaimClick}
                            disabled={linkData === undefined}
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
