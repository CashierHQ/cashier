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
import { useEffect, useState } from "react";
import { FixedBottomButton } from "@/components/fix-bottom-button";

export const linkDetailsSchema = z.object({
    image: z.string().min(1, { message: "Image is required" }),
    description: z.string().min(10),
    title: z.string({ required_error: "Name is required" }).min(1, { message: "Name is required" }),
    amount: z.coerce.number().min(1),
});

type InputSchema = z.infer<typeof linkDetailsSchema>;

export default function LinkDetails({
    defaultValues = {},
    handleSubmit,
    handleChange,
}: ParitalFormProps<InputSchema, Partial<InputSchema>>) {
    const { t } = useTranslation();
    const [currentImage, setCurrentImage] = useState<string>("");

    const form = useForm<InputSchema>({
        resolver: zodResolver(linkDetailsSchema),
        defaultValues: {
            description: "",
            title: "",
            amount: 1,
            image: "",
            ...defaultValues,
        },
    });

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
                form.setValue("amount", Number(value) - 1);
            }
        } else {
            form.setValue("amount", Number(value) + 1);
        }
    };

    useEffect(() => {
        setCurrentImage(form.getValues("image"));
    }, []);

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
                    <FixedBottomButton type="submit" variant="default" size="lg">
                        {t("continue")}
                    </FixedBottomButton>
                </form>
            </Form>
        </div>
    );
}
