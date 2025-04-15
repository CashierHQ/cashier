import { LINK_TYPE } from "@/services/types/enum";

export interface TEMPLATE {
    label: string;
    header: string;
    message: string;
    title: string;
    src: string;
    isComingSoon?: boolean;
    linkType: LINK_TYPE;
}
