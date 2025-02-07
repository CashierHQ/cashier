import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { PartialFormProps } from "@/components/multi-step-form";
import { LINK_TYPE } from "@/services/types/enum";
import { NftAssetForm } from "@/components/link-details/nft-asset-form";
import { TipLinkAssetForm } from "@/components/link-details/tip-link-asset-form";
import { TipLinkAssetFormSchema } from "@/components/link-details/tip-link-asset-form.hooks";

export const linkDetailsSchema = z.object({
    image: z.string(),
    description: z.string(),
    title: z.string({ required_error: "Name is required" }).min(1, { message: "Name is required" }),
    amountNumber: z.coerce
        .number({ message: "Must input number" })
        .positive({ message: "Must be greater than 0" }),
    amount: z.bigint(),
    tokenAddress: z.string().min(1, { message: "Asset is required" }),
    linkType: z.string(),
});
export type InputSchema = z.infer<typeof linkDetailsSchema>;

export default function LinkDetails({
    defaultValues = {},
    handleSubmit,
    handleChange,
}: PartialFormProps<InputSchema, Partial<InputSchema>>) {
    const form = useForm<InputSchema>({
        resolver: zodResolver(linkDetailsSchema),
        defaultValues: {
            description: "",
            title: "",
            amount: BigInt(0),
            amountNumber: 0,
            image: "",
            linkType: LINK_TYPE.NFT_CREATE_AND_AIRDROP,
            ...defaultValues,
        },
    });

    const handleTipLinkAssetFormSubmit: SubmitHandler<TipLinkAssetFormSchema> = (data) => {
        handleSubmit({
            image: "",
            description: form.getValues("description"),
            title: form.getValues("title"),
            amountNumber: data.assetNumber!,
            amount: data.amount!,
            tokenAddress: data.tokenAddress!,
            linkType: LINK_TYPE.TIP_LINK,
        });
    };

    const render = () => {
        const linkType = form.getValues("linkType") as LINK_TYPE;

        switch (linkType) {
            case LINK_TYPE.TIP_LINK:
                return (
                    <TipLinkAssetForm
                        defaultValues={{ tokenAddress: defaultValues.tokenAddress }}
                        onSubmit={handleTipLinkAssetFormSubmit}
                    />
                );
            default:
                return <NftAssetForm form={form} onChange={handleChange} onSubmit={handleSubmit} />;
        }
    };

    return render();
}
