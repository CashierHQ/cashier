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
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
import { FileInput } from "@/components/file-input";
import { fileToBase64, resizeImage } from "@/utils";
import { NumberInput } from "@/components/number-input";

const linkDetailsSchema = z.object({
    photo: z.string().min(1, { message: "Photo is required" }),
    message: z.string().min(10),
    chain: z.string(),
    name: z.string({ required_error: "Name is required" }).min(1, { message: "Name is required" }),
    amount: z.coerce.number().min(1),
});

export default function LinkDetails({
    defaultValues = {},
    handleSubmit,
    handleChange,
}: ParitalFormProps<z.infer<typeof linkDetailsSchema>>) {
    const { t } = useTranslation();

    const form = useForm<z.infer<typeof linkDetailsSchema>>({
        resolver: zodResolver(linkDetailsSchema),
        defaultValues: {
            message: "",
            chain: "ICP",
            name: "",
            amount: 1,
            photo: "",
            ...defaultValues,
        },
    });

    const handleUploadImage = async (file: File | null) => {
        if (!file) {
            form.setValue("photo", "");
            handleChange({ "photo": "" })
            return;
        }
        const resizedImage = await resizeImage(file);
        const base64 = await fileToBase64(resizedImage);
        form.setValue("photo", base64, { shouldValidate: true });
        handleChange({ "photo": base64 })
    };

    return (
        <div className="w-full">
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(handleSubmit)}
                    onChange={(e: any) => handleChange({ [e.target.name]: e.target.value })}
                    className="space-y-8 mb-[100px]"
                >
                    <Controller
                        name="photo"
                        control={form.control}
                        rules={{ required: true }}
                        render={() => {
                            return (
                                <div>
                                    <FormLabel>{t("create.photo")}</FormLabel>
                                    <FileInput defaultValue={form.getValues("photo") as any} onFileChange={handleUploadImage} />
                                    {form.formState.errors.photo && <FormMessage>{form.formState.errors.photo.message}</FormMessage>}
                                </div>

                            )
                        }}
                    />
                    <FormField
                        control={form.control}
                        name="name"
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
                        name="message"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("create.message")}</FormLabel>
                                <FormControl>
                                    <Textarea className="resize-none" placeholder={t("create.message")} {...field} />
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
                                <FormLabel>{t("create.amount")}</FormLabel>
                                <FormControl>
                                    <NumberInput
                                        placeholder={t("create.amount")}
                                        handleIncrease={() => form.setValue("amount", Number(field.value) + 1)}
                                        handleDecrease={() => form.setValue("amount", Number(field.value) - 1)}
                                        min={0}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="chain"
                        render={({ field }) => (
                            <FormItem>

                                <FormLabel>{t("create.chain")}</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a Chain" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="ICP">ICP</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="fixed bottom-[30px] w-[80vw] max-w-[350px] left-1/2 -translate-x-1/2">{t("continue")}</Button>
                </form>
            </Form>
        </div>
    );
}
