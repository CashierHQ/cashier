import AssetButton from "@/components/asset-button";
import AssetDrawer from "@/components/asset-drawer";
import { AssetSelectItem } from "@/components/asset-select";
import { useConfirmButtonState } from "@/components/confirmation-drawer/confirmation-drawer.hooks";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import { IconInput } from "@/components/icon-input";
import { SelectedAssetButtonInfo } from "@/components/link-details/selected-asset-button-info";
import { useUserAssets } from "@/components/link-details/tip-link-asset-form.hooks";
import TransactionToast from "@/components/transaction/transaction-toast";
import { BackHeader } from "@/components/ui/back-header";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    useSelectedWalletSendAsset,
    useWalletSendAssetForm,
    useWalletSendAssetFormActions,
    WalletSendAssetFormSchema,
} from "@/components/wallet/send/send-asset-form.hooks";
import { MOCK_TOKENS_LIST } from "@/constants/mock-data";
import useTokenMetadata from "@/hooks/tokenUtilsHooks";
import useToast from "@/hooks/useToast";
import { useTokenMetadataList } from "@/hooks/useTokenMetadataQuery";
import CanisterUtilsService from "@/services/canisterUtils.service";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { ACTION_STATE } from "@/services/types/enum";
import { convertTokenAmountToNumber } from "@/utils";
import { AccountIdentifier } from "@dfinity/ledger-icp";
import { useAuth, useIdentity } from "@nfid/identitykit/react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdOutlineContentPaste } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";

export default function SendTokenPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const identity = useIdentity();
    const goBack = () => navigate("/wallet");
    const { tokenId } = useParams<{ tokenId: string }>();
    const { metadata } = useTokenMetadata(tokenId);
    const { data: metadataList } = useTokenMetadataList();
    const { user } = useAuth();
    const { toastData, showToast, hideToast } = useToast();

    const [accountId, setAccountId] = useState<string>("");
    const [showAssetDrawer, setShowAssetDrawer] = useState<boolean>(false);

    const { isDisabled, setIsDisabled, buttonText, setButtonText } = useConfirmButtonState(
        ACTION_STATE.CREATED,
        t,
    );

    const { isLoadingAssets, isLoadingBalance, assets: defaultAssetList } = useUserAssets();

    const assetSelectedItem: AssetSelectItem = {
        name: metadata?.symbol || "",
        tokenAddress: tokenId ?? "",
        amount: undefined,
    };

    // const defaultAssetList = useMemo(() => {
    //     return MOCK_TOKENS_LIST.map((token) => ({
    //         name: token.name,
    //         tokenAddress: token.address,
    //         amount: TokenUtilService.getHumanReadableAmountFromMetadata(
    //             token.amount,
    //             metadataList?.find((metadata) => metadata.canisterId === token.address)?.metadata,
    //         ),
    //     }));
    // }, [assetSelectedItem.name, assetSelectedItem.tokenAddress, metadataList]);

    const form = useWalletSendAssetForm(defaultAssetList ?? [], {
        tokenAddress: tokenId ?? "",
        amount: BigInt(0),
        assetNumber: 0,
    });

    const selectedAsset = useSelectedWalletSendAsset(defaultAssetList, form);
    const { setTokenAmount, setTokenAddress, setWalletAddress } =
        useWalletSendAssetFormActions(form);

    const handleSetTokenAddress = (address: string) => {
        setTokenAddress(address);
        setShowAssetDrawer(false);
    };

    const handleAmountInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setTokenAmount(value);
    };

    const handleSetWalletAddress = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setWalletAddress(value);
    };

    const onSubmitSend = async (data: WalletSendAssetFormSchema) => {
        console.log(data);
        setButtonText("Sending...");
        setIsDisabled(true);
        try {
            if (metadata) {
                const canisterUtils = new CanisterUtilsService(identity);
                await canisterUtils.transferTo(
                    data.walletAddress,
                    data.tokenAddress,
                    convertTokenAmountToNumber(data.assetNumber ?? 0, metadata.decimals),
                );
                showToast("Success", "Transfer successful", "default");
            } else {
                console.log("Can not get token metadata");
                showToast("Error", "Can not get token metadata", "error");
            }
        } catch (e) {
            console.log(e);
            showToast("Error", "Unexpected", "error");
        } finally {
            setButtonText("Confirm");
            setIsDisabled(false);
        }
    };

    const handlePasteClick = async (field: { onChange: (value: string) => void }) => {
        try {
            console.log("Paste");
            // Check principal format
            const text = await navigator.clipboard.readText();
            field.onChange(text);
        } catch (err) {
            console.error("Failed to read clipboard contents: ", err);
        }
    };

    useEffect(() => {
        if (user?.principal) {
            const account = AccountIdentifier.fromPrincipal({
                principal: user.principal,
            });
            if (account) {
                setAccountId(account.toHex());
            }
        }
    }, [user]);

    return (
        <div className="h-full overflow-auto px-4 py-2">
            <BackHeader onBack={goBack}>
                <h1 className="text-lg font-semibold">{t("wallet.receive.header")}</h1>
            </BackHeader>
            <div id="content" className="mx-2 my-5">
                <>
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit((data) => {
                                onSubmitSend(data);
                            })}
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
                                                    isLoadingBalance={false}
                                                />
                                            }
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name={"assetNumber"}
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center">
                                            <FormLabel>{t("create.amount")}</FormLabel>
                                        </div>
                                        <FormControl>
                                            <IconInput
                                                type="number"
                                                step="any"
                                                isCurrencyInput={true}
                                                currencySymbol={selectedAsset?.name}
                                                {...field}
                                                value={form.getValues("assetNumber") ?? ""}
                                                onChange={handleAmountInputChange}
                                                className="pl-3 py-5 h-14 text-md rounded-xl appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                            />
                                        </FormControl>

                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name={"walletAddress"}
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center">
                                            <FormLabel>Wallet address</FormLabel>
                                        </div>
                                        <FormControl>
                                            <IconInput
                                                type="text"
                                                step="any"
                                                isCurrencyInput={false}
                                                rightIcon={
                                                    <MdOutlineContentPaste
                                                        size={20}
                                                        color="green"
                                                    />
                                                }
                                                onRightIconClick={() => handlePasteClick(field)}
                                                {...field}
                                                value={form.getValues("walletAddress") ?? ""}
                                                onChange={handleSetWalletAddress}
                                                className="pl-3 py-5 h-14 text-md rounded-xl appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                            />
                                        </FormControl>

                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FixedBottomButton
                                type="submit"
                                variant="default"
                                size="lg"
                                disabled={isDisabled}
                                className="fixed bottom-[30px] left-1/2 -translate-x-1/2"
                                onClick={() => console.log(form.formState.errors)}
                            >
                                {buttonText}
                            </FixedBottomButton>
                        </form>
                    </Form>

                    <AssetDrawer
                        title="Select Asset"
                        open={showAssetDrawer}
                        handleClose={() => setShowAssetDrawer(false)}
                        handleChange={handleSetTokenAddress}
                        assetList={defaultAssetList ?? []}
                        isLoadingBalance={false}
                    />
                </>
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
