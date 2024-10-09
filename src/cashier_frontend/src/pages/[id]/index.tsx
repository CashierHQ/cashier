import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import LinkService from "@/services/link.service";
import LinkCard from "@/components/link-card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { IoIosArrowBack } from "react-icons/io";
import LinkCardWithoutPhoneFrame from "@/components/link-card-without-phone-frame";

const ClaimSchema = z.object({
    token: z.string().min(5),
    address: z.string().min(5),
    amount: z.coerce.number().min(0),
});

export default function ClaimPage() {
    const [formData, setFormData] = useState<any>({});
    const { linkId } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [isClaiming, setIsClaiming] = useState(false);
    const { t } = useTranslation();
    const form = useForm<z.infer<typeof ClaimSchema>>({
        resolver: zodResolver(ClaimSchema),
    });

    useEffect(() => {
        if (!linkId) return;
        const fetchData = async () => {
            const link = await new LinkService().getLink(linkId);
            setFormData(link);
            form.setValue("token", link.title);
            form.setValue("amount", link.amount);
            setIsLoading(false);
        };
        fetchData();
    }, [linkId]);

    if (isLoading) return null;

    const handleClaim = async () => {};

    if (isClaiming)
        return (
            <div className="w-screen flex flex-col items-center py-5">
                <div className="w-11/12 max-w-[400px]">
                    <div className="w-full flex justify-center items-center">
                        <img src="./logo.svg" alt="Cashier logo" className="max-w-[130px]" />
                    </div>
                    <div className="w-full flex justify-center items-center mt-5 relative">
                        <h3 className="font-semibold">{t("claim.claim")}</h3>
                        <div className="absolute left-[10px]" onClick={() => setIsClaiming(false)}>
                            <IoIosArrowBack />
                        </div>
                    </div>
                    <Form {...form}>
                        <form
                            className="flex flex-col gap-y-[10px] mt-3"
                            onSubmit={form.handleSubmit(handleClaim)}
                        >
                            <FormField
                                control={form.control}
                                name="token"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("claim.claimToken")}</FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled
                                                defaultValue={formData.title}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("claim.amount")}</FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled
                                                defaultValue={formData.amount ?? 1}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("claim.address")}</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t("claim.addressPlaceholder")}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button
                                type="submit"
                                className="fixed bottom-[30px] w-[80vw] max-w-[350px] left-1/2 -translate-x-1/2"
                            >
                                {t("continue")}
                            </Button>
                        </form>
                    </Form>
                </div>
            </div>
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
                    onClaim={() => setIsClaiming(true)}
                />
                <div id="about-user-section" className="mt-5 px-3">
                    <div className="text-lg font-medium">About user</div>
                    <div className="text-base">
                        User has confirmed he owns the handles of the following social accounts
                    </div>
                </div>
            </div>
        </div>
    );
}
