import { LINK_TYPE } from "@/services/types/enum";
//import { NftAssetForm } from "@/components/link-details/nft-asset-form";
import { TipLinkAssetForm } from "@/components/link-details/tip-link-asset-form";
import { TipLinkAssetFormSchema } from "@/components/link-details/tip-link-asset-form.hooks";
import { useCreateLinkStore } from "@/stores/createLinkStore";
import { useSetTipLinkDetails } from "@/hooks/linkHooks";
import { useMultiStepFormContext } from "@/contexts/multistep-form-context";

export default function LinkDetails() {
    const { nextStep } = useMultiStepFormContext();
    const { link, setLink } = useCreateLinkStore();
    const { mutateAsync: setTipLinkDetails } = useSetTipLinkDetails();

    const handleSubmitTipLinkDetails = async (data: TipLinkAssetFormSchema) => {
        const updatedLink = await setTipLinkDetails({
            link: link!,
            patch: data,
        });
        setLink(updatedLink);
        nextStep();
    };

    const render = () => {
        switch (link!.linkType) {
            case LINK_TYPE.TIP_LINK:
                return <TipLinkAssetForm onSubmit={handleSubmitTipLinkDetails} />;
            case LINK_TYPE.NFT_CREATE_AND_AIRDROP:
                // TODO: uncouple NftAssetForm from link details
                //return <NftAssetForm form={form} onChange={handleChange} onSubmit={handleSubmit} />;
                return null;
            default:
                return null;
        }
    };

    return render();
}
