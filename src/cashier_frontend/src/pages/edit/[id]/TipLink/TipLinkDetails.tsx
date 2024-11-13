import { Input } from "@/components/ui/input";
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
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { ParitalFormProps } from "@/components/multi-step-form";
import { NumberInput } from "@/components/number-input";
import { DECREASE, INCREASE } from "@/constants/otherConst";
import { useEffect, useState } from "react";
import AssetSelect, { AssetSelectItem } from "@/components/asset-select";

const linkDetailsSchema = z.object({
    asset: z.string(),
    amount: z.coerce.number().min(1),
});

const assetListMock: AssetSelectItem[] = [
    {
        name: "ICP",
        amount: 125.4,
    },
    {
        name: "ETH",
        amount: 89.3,
    },
];

export default function TipLinkDetails({
    defaultValues = {},
    handleSubmit,
    handleChange,
}: ParitalFormProps<z.infer<typeof linkDetailsSchema>>) {
    const { t } = useTranslation();
    const [currentImage, setCurrentImage] = useState<string>("");

    const form = useForm<z.infer<typeof linkDetailsSchema>>({
        resolver: zodResolver(linkDetailsSchema),
        defaultValues: {
            asset: "",
            amount: 1,
            ...defaultValues,
        },
    });

    const handleAdjustAmount = (request: string, value: number) => {
        if (request === DECREASE) {
            if (value > 1) {
                form.setValue("amount", Number(value) - 1);
            }
        } else {
            form.setValue("amount", Number(value) + 1);
        }
    };

    return (
        <div className="w-full">
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(handleSubmit)}
                    onChange={(e: any) => handleChange({ [e.target.name]: e.target.value })}
                    className="space-y-8 mb-[100px]"
                >
                    <FormField
                        control={form.control}
                        name="asset"
                        defaultValue={"ICP"}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("create.asset")}</FormLabel>
                                <AssetSelect
                                    assetList={assetListMock}
                                    defaultValue={assetListMock[1].name}
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="amount"
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

                    <Button
                        type="submit"
                        className="fixed text-[1rem] bottom-[30px] w-[80vw] max-w-[350px] rounded-full left-1/2 -translate-x-1/2 py-5"
                    >
                        {t("continue")}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
