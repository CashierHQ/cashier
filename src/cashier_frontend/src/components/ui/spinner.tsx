import { ComponentProps, FC, ImgHTMLAttributes } from "react";

interface SpinnerProps extends ImgHTMLAttributes<HTMLImageElement> {}

export const Spinner: FC<SpinnerProps> = ({ ...props }) => {
    return <img src="/loading.gif" {...props} />;
};
