import { FC, useState } from "react";
import { DefaultValues, SubmitHandler } from "react-hook-form";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { IconInput } from "@/components/icon-input";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import AssetButton from "@/components/asset-button";
import AssetDrawer from "@/components/asset-drawer";
import { useTranslation } from "react-i18next";
import { AssetFormSkeleton } from "./asset-form-skeleton";
import { SelectedAssetButtonInfo } from "./selected-asset-button-info";
import { UsdSwitch } from "./usd-switch";
import {
    useSelectedAsset,
    useAssets,
    useHandleSetAmount,
    useHandleSetTokenAddress,
    TipLinkAssetFormSchema,
} from "./tip-link-asset-form.hooks";
import { useTipLinkAssetForm } from "./tip-link-asset-form.hooks";

type TipLinkAssetFormProps = {
    defaultValues: DefaultValues<TipLinkAssetFormSchema>;
    onSubmit: SubmitHandler<TipLinkAssetFormSchema>;
};

export const TipLinkAssetForm: FC<TipLinkAssetFormProps> = ({ onSubmit, defaultValues }) => {
    const { t } = useTranslation();

    const [showAssetDrawer, setShowAssetDrawer] = useState<boolean>(false);
    const [isUsd, setIsUsd] = useState<boolean>(false);

    const { isLoadingAssets, isLoadingBalance, assets } = useAssets();

    const form = useTipLinkAssetForm(assets, {
        assetNumber: 0,
        usdNumber: 0,
        amount: BigInt(0),
        tokenAddress: defaultValues.tokenAddress ?? "",
    });

    const selectedAsset = useSelectedAsset(assets, form);

    const handleSetAmount = useHandleSetAmount(form);
    const handleSetTokenAddress = useHandleSetTokenAddress(form, () => setShowAssetDrawer(false));

    return (
        <div className="w-full">
            {isLoadingAssets ? (
                <AssetFormSkeleton />
            ) : (
                <>
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-8 mb-[100px]"
                        >
                            <FormField
                                name="tokenAddress"
                                control={form.control}
                                render={() => (
                                    <FormItem>
                                        <FormLabel>{t("create.asset")}</FormLabel>
                                        <AssetButton
                                            handleClick={() => setShowAssetDrawer(true)}
                                            text="Choose Asset"
                                            childrenNode={
                                                <SelectedAssetButtonInfo
                                                    selectedToken={selectedAsset}
                                                    isLoadingBalance={isLoadingBalance}
                                                />
                                            }
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={isUsd ? "usdNumber" : "assetNumber"}
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center">
                                            <FormLabel>{t("create.amount")}</FormLabel>
                                            <UsdSwitch
                                                amount={form.getValues("assetNumber") ?? undefined}
                                                amountUsd={form.getValues("usdNumber") ?? undefined}
                                                symbol={selectedAsset?.name ?? ""}
                                                isUsd={isUsd}
                                                onToggle={setIsUsd}
                                            />
                                        </div>
                                        <FormControl>
                                            <IconInput
                                                type="number"
                                                isCurrencyInput={true}
                                                currencySymbol={
                                                    isUsd ? "USD" : (selectedAsset?.name ?? "")
                                                }
                                                {...field}
                                                value={
                                                    isUsd
                                                        ? (form.getValues("usdNumber") ?? "")
                                                        : (form.getValues("assetNumber") ?? "")
                                                }
                                                onChange={(e) =>
                                                    handleSetAmount(isUsd, e.target.value)
                                                }
                                                disabled={isLoadingBalance}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FixedBottomButton type="submit" variant="default" size="lg">
                                {t("continue")}
                            </FixedBottomButton>
                        </form>
                    </Form>

                    <AssetDrawer
                        title="Select Asset"
                        open={showAssetDrawer}
                        handleClose={() => setShowAssetDrawer(false)}
                        handleChange={(address) => handleSetTokenAddress(isUsd, address)}
                        assetList={assets}
                        isLoadingBalance={isLoadingBalance}
                    />
                </>
            )}
        </div>
    );
};
