import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import LinkService from "@/services/link.service";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import LinkCardWithoutPhoneFrame from "@/components/link-card-without-phone-frame";
import { LinkDetailModel } from "@/services/types/link.service.types";
import ClaimPageForm from "@/components/claim-page/claim-page-form";
import TransactionToast, {
    TransactionToastProps,
} from "@/components/transaction/transaction-toast";

export const ClaimSchema = z.object({
    token: z.string().min(5),
    address: z.string().min(5),
    amount: z.coerce.number().min(1),
});

const defaultClaimingAmount = 1;

export default function ClaimPage() {
    const [formData, setFormData] = useState<LinkDetailModel>({} as LinkDetailModel);
    const { linkId } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [isClaiming, setIsClaiming] = useState(false);
    const [toastData, setToastData] = useState<TransactionToastProps | null>(null);

    const form = useForm<z.infer<typeof ClaimSchema>>({
        resolver: zodResolver(ClaimSchema),
    });

    useEffect(() => {
        if (!linkId) return;
        const fetchData = async () => {
            const linkObj = await new LinkService().getLink(linkId);
            const link = linkObj.link;
            setFormData(link);
            form.setValue("token", link.title);
            form.setValue("amount", defaultClaimingAmount);
            setIsLoading(false);
        };
        fetchData();
    }, [linkId]);

    if (isLoading) return null;

    const handleClaim = async () => {
        console.log("Claiming");
    };

    /* TODO: Remove after grant submit */
    const handleClaimClick = () => {
        setToastData({
            open: true,
            title: "Under development",
            description: "We are developing the claiming feature. It'll be available soon.",
            variant: "error",
        });
    };

    if (isClaiming)
        return (
            <ClaimPageForm
                form={form}
                formData={formData}
                setIsClaiming={setIsClaiming}
                handleClaim={handleClaim}
            />
        );

    return (
        <div className="w-screen h-screen flex flex-col items-center py-5">
            <div className="w-11/12 max-w-[400px]">
                <div className="w-full flex justify-center items-center">
                    <img src="./logo.svg" alt="Cashier logo" className="max-w-[130px]" />
                </div>
                <LinkCardWithoutPhoneFrame
                    label="Claim"
                    src={formData.image}
                    message={formData.description}
                    title={formData.title}
                    onClaim={handleClaimClick}
                />
            </div>

            <TransactionToast
                open={toastData?.open ?? false}
                onOpenChange={(open) =>
                    setToastData({
                        open: open as boolean,
                        title: "",
                        description: "",
                        variant: null,
                    })
                }
                title={toastData?.title ?? ""}
                description={toastData?.description ?? ""}
                variant={toastData?.variant ?? "default"}
            />
        </div>
    );
}
