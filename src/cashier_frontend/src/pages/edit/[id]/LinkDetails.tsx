import { Input } from "@/components/ui/input";
import Resizer from "react-image-file-resizer";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { ParitalFormProps } from "@/components/multi-step-form";
import { FileInput } from "@/components/file-input";
import { NumberInput } from "@/components/number-input";
import { DECREASE, INCREASE } from "@/constants/otherConst";
import { ReactNode, useEffect, useState } from "react";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import { AssetSelectItem } from "@/components/asset-select";
import { LINK_TYPE } from "@/services/types/enum";
import { useAuth, useIdentity } from "@nfid/identitykit/react";
import {
    IC_EXPLORER_IMAGES_PATH,
    icExplorerService,
    initializeDefautGetUserTokenRequest,
    mapAPITokenModelToAssetSelectModel,
    UserToken,
} from "@/services/icExplorer.service";
import AssetButton from "@/components/asset-button";
import AssetDrawer from "@/components/asset-drawer";
import { IconInput } from "@/components/icon-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import useTokenMetadata from "@/hooks/tokenUtilsHooks";
import { convertTokenAmountToNumber } from "@/utils";
import CanisterUtilsService from "@/services/canisterUtils.service";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { Skeleton } from "@/components/ui/skeleton";

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
type InputSchema = z.infer<typeof linkDetailsSchema>;

const ASSET_LIST: AssetSelectItem[] = [
    {
        name: "TK 1",
        amount: 0,
        tokenAddress: "x5qut-viaaa-aaaar-qajda-cai",
    },
    {
        name: "CUTE",
        amount: 0,
        tokenAddress: "k64dn-7aaaa-aaaam-qcdaq-cai",
    },
];

export default function LinkDetails({
    defaultValues = {},
    handleSubmit,
    handleChange,
}: ParitalFormProps<InputSchema, Partial<InputSchema>>) {
    const { t } = useTranslation();
    const { user: walletUser } = useAuth();
    const identity = useIdentity();

    const walletAddress = walletUser ? walletUser.principal.toString() : "";
    const [currentImage, setCurrentImage] = useState<string>("");
    const [assetList, setAssetList] = useState<AssetSelectItem[]>([]);
    const [openAssetList, setOpenAssetList] = useState<boolean>(false);
    const [selectedToken, setSelectedToken] = useState<AssetSelectItem>();
    const [isLoading, setLoading] = useState(true);
    const [isLoadingBalance, setIsLoadingBalance] = useState(true);

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
    const { metadata } = useTokenMetadata(form.getValues("tokenAddress"));

    const resizeFile = (file: File) =>
        new Promise((resolve) => {
            Resizer.imageFileResizer(
                file,
                400,
                400,
                "JPEG",
                100,
                0,
                (uri) => {
                    resolve(uri);
                },
                "base64",
                400,
                400,
            );
        });

    const handleUploadImage = async (file: File | null) => {
        if (!file) {
            form.setValue("image", "");
            handleChange({ image: "" });
            return;
        }
        const resizedImage = (await resizeFile(file)) as string;
        //const base64 = await fileToBase64(resizedImage);
        form.setValue("image", resizedImage, { shouldValidate: true });
        handleChange({ image: resizedImage });
        setCurrentImage(resizedImage);
    };

    const handleAdjustAmount = (request: string, value: number) => {
        if (request === DECREASE) {
            if (value > 1) {
                form.setValue("amountNumber", Number(value) - 1);
            }
        } else {
            form.setValue("amountNumber", Number(value) + 1);
        }
    };

    const onSelectAsset = (value: string) => {
        const selectedToken = assetList.find((asset) => asset.tokenAddress === value);
        if (selectedToken) {
            handleChange({ tokenAddress: selectedToken.tokenAddress });
            form.setValue("tokenAddress", selectedToken.tokenAddress);
            form.clearErrors("amount");
            setSelectedToken(selectedToken);
            setOpenAssetList(false);
        }
    };

    const fetchAssetListAmounts = async (assetList: AssetSelectItem[]) => {
        const canisterUtilService = new CanisterUtilsService(identity);

        const assetListWithAmounts = await Promise.all(
            assetList.map(async (asset) => {
                const amountFetched = await canisterUtilService.checkAccountBalance(
                    asset.tokenAddress,
                    identity?.getPrincipal().toString(),
                );

                if (amountFetched === null) {
                    return asset;
                }

                const parsedAmount = await TokenUtilService.getHumanReadableAmount(
                    amountFetched,
                    asset.tokenAddress,
                );

                return {
                    ...asset,
                    amount: parsedAmount,
                };
            }),
        );
        return assetListWithAmounts;
    };

    // Fetch user current assets
    useEffect(() => {
        async function fetchUserToken() {
            if (walletAddress) {
                const result = await getUserToken();
                const assetList: AssetSelectItem[] = result.map((token) => {
                    return mapAPITokenModelToAssetSelectModel(token);
                });

                assetList.push(...ASSET_LIST);

                fetchAssetListAmounts(assetList).then((assetListWithAmounts) => {
                    setIsLoadingBalance(false);
                    setAssetList(assetListWithAmounts);
                });

                setAssetList((prev) => [...prev, ...assetList]);
                setLoading(false);
            }
        }

        setCurrentImage(form.getValues("image"));
        fetchUserToken();
    }, [walletAddress]);

    useEffect(() => {
        if (assetList && assetList.length > 0) {
            if (defaultValues.tokenAddress) {
                const selectedToken = assetList.find(
                    (asset) => asset.tokenAddress === defaultValues.tokenAddress,
                );

                if (selectedToken) {
                    onSelectAsset(selectedToken.tokenAddress);
                }
            } else {
                onSelectAsset(assetList[0].tokenAddress);
            }
        }
    }, [assetList]);

    async function getUserToken(): Promise<UserToken[]> {
        const request = initializeDefautGetUserTokenRequest(walletAddress);
        const response = await icExplorerService.getUserTokens(request);
        const userTokenList = response.data.list as UserToken[];
        return userTokenList;
    }

    const onSubmit = form.handleSubmit((data) => {
        const { tokenAddress, amountNumber } = data;
        const relevantAsset = assetList.find((asset) => asset.tokenAddress === tokenAddress);
        const amountInWallet = relevantAsset?.amount;

        if (amountInWallet === undefined) {
            form.setError("amountNumber", {
                type: "manual",
                message: "Unable to validate balance",
            });

            return;
        }

        if (amountNumber > amountInWallet) {
            form.setError("amountNumber", {
                type: "manual",
                message: "Your balance is not enough",
            });

            return;
        }

        handleSubmit(data);
    });

    const selectedAssetButtonInfo = (): React.ReactNode => {
        if (selectedToken) {
            return (
                <div className="flex font-normal">
                    <Avatar className="mr-3">
                        <AvatarImage
                            src={`${IC_EXPLORER_IMAGES_PATH}${selectedToken.tokenAddress}`}
                        />
                        <AvatarFallback>{selectedToken.name}</AvatarFallback>
                    </Avatar>
                    <div id="asset-info" className="text-md text-left">
                        <div>{selectedToken.name}</div>
                        <div>
                            {isLoadingBalance ? (
                                <Skeleton className="w-[130px] h-4 mt-1" />
                            ) : (
                                `Balance ${selectedToken.amount} ${selectedToken.name}`
                            )}
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    const renderLoading = () => {
        return Array.from({ length: 5 }).map((_, index) => (
            <div className="flex items-center space-x-4 my-3" key={index}>
                <Skeleton className="h-10 w-10 rounded-sm" />
                <div className="space-y-2">
                    <Skeleton className="h-3 w-[75vw] max-w-[320px]" />
                    <Skeleton className="h-3 w-[200px]" />
                </div>
            </div>
        ));
    };

    const renderTipLinkAssetForm = () => {
        return (
            <div className="w-full">
                {isLoading ? (
                    renderLoading()
                ) : (
                    <>
                        <Form {...form}>
                            <form onSubmit={onSubmit} className="space-y-8 mb-[100px]">
                                <FormField
                                    name="tokenAddress"
                                    control={form.control}
                                    render={() => (
                                        <FormItem>
                                            <FormLabel>{t("create.asset")}</FormLabel>
                                            <AssetButton
                                                handleClick={() => setOpenAssetList(true)}
                                                text="Choose Asset"
                                                childrenNode={selectedAssetButtonInfo()}
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="amountNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <IconInput
                                                    isCurrencyInput={true}
                                                    currencySymbol={selectedToken?.name ?? ""}
                                                    {...field}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const tokenDecimals = metadata?.decimals;
                                                        if (tokenDecimals) {
                                                            form.setValue(
                                                                "amount",
                                                                BigInt(
                                                                    convertTokenAmountToNumber(
                                                                        Number(val),
                                                                        tokenDecimals,
                                                                    ),
                                                                ),
                                                            );
                                                        }
                                                        field.onChange(e);
                                                    }}
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
                            open={openAssetList}
                            handleClose={() => setOpenAssetList(false)}
                            handleChange={onSelectAsset}
                            assetList={assetList}
                            isLoadingBalance={isLoadingBalance}
                        />
                    </>
                )}
            </div>
        );
    };

    const renderNFTAssetForm = () => {
        return (
            <div className="w-full">
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onChange={(e: any) => handleChange({ [e.target.name]: e.target.value })}
                        className="space-y-8 mb-[100px]"
                    >
                        <Controller
                            name="image"
                            control={form.control}
                            rules={{ required: true }}
                            render={() => {
                                return (
                                    <div>
                                        <FormLabel>{t("create.photo")}</FormLabel>
                                        <FileInput
                                            defaultValue={currentImage}
                                            onFileChange={handleUploadImage}
                                        />
                                        {form.formState.errors.image && (
                                            <FormMessage>
                                                {form.formState.errors.image.message}
                                            </FormMessage>
                                        )}
                                    </div>
                                );
                            }}
                        />
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("create.name")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("create.name")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("create.message")}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            className="resize-none"
                                            placeholder={t("create.message")}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="amountNumber"
                            defaultValue={1}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("create.amount")}</FormLabel>
                                    <FormControl>
                                        <NumberInput
                                            placeholder={t("create.amount")}
                                            handleIncrease={() =>
                                                handleAdjustAmount(INCREASE, Number(field.value))
                                            }
                                            handleDecrease={() =>
                                                handleAdjustAmount(DECREASE, Number(field.value))
                                            }
                                            min={1}
                                            disableDecrease={Number(field.value) <= 1}
                                            {...field}
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
            </div>
        );
    };

    if (form.getValues("linkType") === LINK_TYPE.TIP_LINK) {
        return renderTipLinkAssetForm();
    } else {
        return renderNFTAssetForm();
    }
}
