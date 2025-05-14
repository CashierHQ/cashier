// import { FC, useState } from "react";
// import {
//     Form,
//     FormControl,
//     FormField,
//     FormItem,
//     FormLabel,
//     FormMessage,
// } from "@/components/ui/form";
// import { Controller, SubmitHandler, UseFormReturn } from "react-hook-form";
// import { InputSchema } from "@/pages/edit/[id]/LinkDetails";
// import { FileInput } from "@/components/file-input";
// import { Textarea } from "@/components/ui/textarea";
// import { Input } from "@/components/ui/input";
// import { NumberInput } from "@/components/number-input";
// import { FixedBottomButton } from "@/components/fix-bottom-button";
// import { useTranslation } from "react-i18next";
// import { DECREASE, INCREASE } from "@/constants/otherConst";
// import Resizer from "react-image-file-resizer";

// type NftAssetFormProps = {
//     form: UseFormReturn<InputSchema>;
//     onSubmit: SubmitHandler<InputSchema>;
//     onChange: SubmitHandler<Partial<InputSchema>>;
// };

// export const NftAssetForm: FC<NftAssetFormProps> = ({ form, onSubmit, onChange }) => {
//     const { t } = useTranslation();
//     const [currentImage, setCurrentImage] = useState<string>("");

//     const resizeFile = (file: File) =>
//         new Promise((resolve) => {
//             Resizer.imageFileResizer(
//                 file,
//                 400,
//                 400,
//                 "JPEG",
//                 100,
//                 0,
//                 (uri) => {
//                     resolve(uri);
//                 },
//                 "base64",
//                 400,
//                 400,
//             );
//         });

//     const handleUploadImage = async (file: File | null) => {
//         if (!file) {
//             form.setValue("image", "");
//             onChange({ image: "" });
//             return;
//         }
//         const resizedImage = (await resizeFile(file)) as string;
//         //const base64 = await fileToBase64(resizedImage);
//         form.setValue("image", resizedImage, { shouldValidate: true });
//         onChange({ image: resizedImage });
//         setCurrentImage(resizedImage);
//     };

//     const handleAdjustAmount = (request: string, value: number) => {
//         if (request === DECREASE) {
//             if (value > 1) {
//                 form.setValue("amountNumber", Number(value) - 1);
//             }
//         } else {
//             form.setValue("amountNumber", Number(value) + 1);
//         }
//     };

//     return (
//         <div className="w-full">
//             <Form {...form}>
//                 <form
//                     onSubmit={form.handleSubmit(onSubmit)}
//                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//                     onChange={(e: any) => onChange({ [e.target.name]: e.target.value })}
//                     className="space-y-8 mb-[100px]"
//                 >
//                     <Controller
//                         name="image"
//                         control={form.control}
//                         rules={{ required: true }}
//                         render={() => {
//                             return (
//                                 <div>
//                                     <FormLabel>{t("create.photo")}</FormLabel>
//                                     <FileInput
//                                         defaultValue={currentImage}
//                                         onFileChange={handleUploadImage}
//                                     />
//                                     {form.formState.errors.image && (
//                                         <FormMessage>
//                                             {form.formState.errors.image.message}
//                                         </FormMessage>
//                                     )}
//                                 </div>
//                             );
//                         }}
//                     />

//                     <FormField
//                         control={form.control}
//                         name="title"
//                         render={({ field }) => (
//                             <FormItem>
//                                 <FormLabel>{t("create.name")}</FormLabel>
//                                 <FormControl>
//                                     <Input placeholder={t("create.name")} {...field} />
//                                 </FormControl>
//                                 <FormMessage />
//                             </FormItem>
//                         )}
//                     />

//                     <FormField
//                         control={form.control}
//                         name="description"
//                         render={({ field }) => (
//                             <FormItem>
//                                 <FormLabel>{t("create.message")}</FormLabel>
//                                 <FormControl>
//                                     <Textarea
//                                         className="resize-none"
//                                         placeholder={t("create.message")}
//                                         {...field}
//                                     />
//                                 </FormControl>
//                                 <FormMessage />
//                             </FormItem>
//                         )}
//                     />

//                     <FormField
//                         control={form.control}
//                         name="amountNumber"
//                         defaultValue={1}
//                         render={({ field }) => (
//                             <FormItem>
//                                 <FormLabel>{t("create.amount")}</FormLabel>
//                                 <FormControl>
//                                     <NumberInput
//                                         placeholder={t("create.amount")}
//                                         handleIncrease={() =>
//                                             handleAdjustAmount(INCREASE, Number(field.value))
//                                         }
//                                         handleDecrease={() =>
//                                             handleAdjustAmount(DECREASE, Number(field.value))
//                                         }
//                                         min={1}
//                                         disableDecrease={Number(field.value) <= 1}
//                                         {...field}
//                                     />
//                                 </FormControl>
//                                 <FormMessage />
//                             </FormItem>
//                         )}
//                     />

//                     <FixedBottomButton type="submit" variant="default" size="lg">
//                         {t("continue")}
//                     </FixedBottomButton>
//                 </form>
//             </Form>
//         </div>
//     );
// };
