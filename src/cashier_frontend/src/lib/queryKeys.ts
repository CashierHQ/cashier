import LinkService from "@/services/link.service";
import UserService from "@/services/user.service";
import { groupLinkListByDate } from "@/utils";
import { Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { createQueryKeyStore } from "@lukemorales/query-key-factory";

export const QUERY_KEYS = {
    LINKS: "links",
    USERS: "users",
};

export const queryKeys = createQueryKeyStore({
    users: {
        detail: (identity: Identity | PartialIdentity | undefined) => ({
            queryKey: [QUERY_KEYS.USERS],
            queryFn: async () => {
                try {
                    const userService = new UserService(identity);
                    const user = await userService.getUser();
                    return user;
                } catch (error) {
                    console.log(error);
                    throw error;
                }
            },
        }),
    },
    links: {
        list: (identity: Identity | PartialIdentity | undefined) => ({
            queryKey: [QUERY_KEYS.LINKS],
            queryFn: async () => {
                let groupedLinkList = null;
                try {
                    const linkService = new LinkService(identity);
                    const links = await linkService.getLinks();
                    groupedLinkList = groupLinkListByDate(links?.data);
                } catch (err) {
                    console.log("🚀 ~ queryFn: ~ err:", err);
                    throw err;
                }
                return groupedLinkList;
            },
        }),
    },
});
