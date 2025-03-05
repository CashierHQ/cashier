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
import { useAuth } from "@nfid/identitykit/react";
import LoginButton from "@/components/login-button";
import useToast from "@/hooks/useToast";

const Header = ({
    connectToWallet,
}: {
    connectToWallet: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) => (
    <div className="w-full flex justify-between items-center mb-5">
        <img src="./logo.svg" alt="Cashier logo" className="max-w-[130px]" />
        <LoginButton onClick={connectToWallet}>Login</LoginButton>
    </div>
);

export const ClaimSchema = z.object({
    token: z.string().min(5),
    amount: z.coerce.number().min(1),
    address: z.string().optional(),
});

export default function ClaimPage() {
    const [formData, setFormData] = useState<LinkDetailModel>({} as LinkDetailModel);
    const { linkId } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [isClaiming, setIsClaiming] = useState(false);
    const { toastData, showToast, hideToast } = useToast();

    const { connect } = useAuth();

    const form = useForm<z.infer<typeof ClaimSchema>>({
        resolver: zodResolver(ClaimSchema),
    });

    useEffect(() => {
        if (!linkId) return;
        const fetchData = async () => {
            const linkObj = await new LinkService().getLink(linkId, ACTION_TYPE.CREATE_LINK);
            const link = linkObj.link;
            setFormData(link);
            form.setValue("token", link.title);
            form.setValue("amount", link.amountNumber);
            setIsLoading(false);
        };
        fetchData();
    }, [linkId]);

    if (isLoading) return null;

    const handleClaim = async () => {
        if (!form.getValues("address") || form.getValues("address")?.length == 0) {
            showToast("Test", "To receive, you need to login or connect your wallet", "error");
            return;
        }
        console.log("Claiming");
    };

    const handleStartClaimClick = () => {
        setIsClaiming(true);
    };

    const connectToWallet = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        connect();
    };

    if (isClaiming)
        return (
            <div className="w-screen flex flex-col items-center py-5">
                <div className="w-11/12 max-w-[400px]">
                    <Header connectToWallet={connectToWallet} />
                    <ClaimPageForm
                        form={form}
                        formData={formData}
                        setIsClaiming={setIsClaiming}
                        handleClaim={handleClaim}
                    />
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

    return (
        <div className="w-screen h-screen flex flex-col items-center py-5">
            <div className="w-11/12 max-w-[400px]">
                <Header connectToWallet={connectToWallet} />
                <LinkCardWithoutPhoneFrame
                    label="Claim"
                    src="/icpLogo.png"
                    message={formData.description}
                    title={formData.title}
                    onClaim={handleStartClaimClick}
                />
            </div>

            <TransactionToast
                open={toastData?.open ?? false}
                onOpenChange={hideToast}
                title={toastData?.title ?? ""}
                description={toastData?.description ?? ""}
                variant={toastData?.variant ?? "default"}
            />
        </div>
    );
}
