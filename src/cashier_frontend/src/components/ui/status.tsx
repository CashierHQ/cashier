import { IoMdCheckmark, IoMdClose } from "react-icons/io";
import { Spinner } from "./spinner";
import { FC } from "react";

export enum STATUS {
    SUCCESS,
    FAIL,
    IN_PROGRESS,
}

export type StatusProps = {
    status: STATUS | undefined;
};

export const Status: FC<StatusProps> = ({ status }) => {
    const renderStatusIcon = () => {
        switch (status) {
            case STATUS.SUCCESS:
                return <IoMdCheckmark color="green" size={22} />;
            case STATUS.FAIL:
                return <IoMdClose color="red" size={22} />;
            case STATUS.IN_PROGRESS:
                return <Spinner width={22} />;
            default:
                return <IoMdCheckmark color="green" size={22} className="opacity-0" />;
        }
    };

    return renderStatusIcon();
};
