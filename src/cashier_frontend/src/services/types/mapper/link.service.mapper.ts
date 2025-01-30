import { convertNanoSecondsToDate } from "@/utils";
import {
    AssetInfo,
    GetLinkResp,
    Link,
    UpdateLinkInput,
} from "../../../../../declarations/cashier_backend/cashier_backend.did";
import { LinkDetailModel, LinkModel } from "../link.service.types";
import {
    ACTION_TYPE,
    CHAIN,
    IC_TRANSACTION_PROTOCAL,
    INTENT_STATE,
    TASK,
    TEMPLATE,
    TRANSACTION_STATE,
    WALLET,
} from "../enum";
import { fromDefinedNullable, fromNullable } from "@dfinity/utils";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { ActionModel } from "../refractor.action.service.types";

const IS_USE_DEFAULT_LINK_TEMPLATE = true;

export const generateMockAction = (): ActionModel => {
    return {
        id: "test111",
        type: ACTION_TYPE.CREATE_LINK,
        intents: [
            {
                id: "1111",
                task: TASK.TRANSFER_WALLET_TO_LINK,
                chain: CHAIN.IC,
                state: INTENT_STATE.PROCESSING,
                from: {
                    address: "36nrw-cqcch-ea3si-53d3r-d4bep-vcvpf-jcuq7-dgaxh-bk3ss-4plti-5qe",
                    chain: CHAIN.IC,
                },
                to: {
                    address: "rdpcv-vctd4-hb7ni-cy5sq-kroai-ultcg-2dh2j-gqaxj-tczxw-reyry-2qe",
                    chain: CHAIN.IC,
                },
                asset: {
                    address: "x5qut-viaaa-aaaar-qajda-cai",
                    chain: CHAIN.IC,
                },
                amount: 250000000n,
                transactions: [
                    {
                        id: "1",
                        wallet: WALLET.WALLET,
                        protocol: IC_TRANSACTION_PROTOCAL.ICRC1_TRANSFER,
                        from: {
                            address:
                                "36nrw-cqcch-ea3si-53d3r-d4bep-vcvpf-jcuq7-dgaxh-bk3ss-4plti-5qe",
                            chain: "IC",
                        },
                        to: {
                            address:
                                "rdpcv-vctd4-hb7ni-cy5sq-kroai-ultcg-2dh2j-gqaxj-tczxw-reyry-2qe",
                            chain: "IC",
                        },
                        asset: {
                            address: "x5qut-viaaa-aaaar-qajda-cai",
                            chain: "IC",
                        },
                        amount: 250000000n,
                        state: TRANSACTION_STATE.CREATED,
                    },
                ],
            },
            {
                id: "222",
                task: TASK.TRANSFER_WALLET_TO_TREASURY,
                chain: CHAIN.IC,
                state: INTENT_STATE.SUCCESS,
                from: {
                    address: "36nrw-cqcch-ea3si-53d3r-d4bep-vcvpf-jcuq7-dgaxh-bk3ss-4plti-5qe",
                    chain: CHAIN.IC,
                },
                to: {
                    address: "rdpcv-vctd4-hb7ni-cy5sq-kroai-ultcg-2dh2j-gqaxj-tczxw-reyry-2qe",
                    chain: CHAIN.IC,
                },
                asset: {
                    address: "x5qut-viaaa-aaaar-qajda-cai",
                    chain: "IC",
                },
                amount: 1000000n,
                transactions: [
                    {
                        id: "2",
                        wallet: WALLET.WALLET,
                        protocol: IC_TRANSACTION_PROTOCAL.ICRC2_APPROVE,
                        from: {
                            address:
                                "36nrw-cqcch-ea3si-53d3r-d4bep-vcvpf-jcuq7-dgaxh-bk3ss-4plti-5qe",
                            chain: "IC",
                        },
                        to: {
                            address:
                                "rdpcv-vctd4-hb7ni-cy5sq-kroai-ultcg-2dh2j-gqaxj-tczxw-reyry-2qe",
                            chain: "IC",
                        },
                        asset: {
                            address: "x5qut-viaaa-aaaar-qajda-cai",
                            chain: "IC",
                        },
                        amount: 10000000n,
                        state: TRANSACTION_STATE.CREATED,
                    },
                    {
                        id: "3",
                        wallet: WALLET.CANISTER,
                        protocol: IC_TRANSACTION_PROTOCAL.ICRC2_TRANSFER,
                        from: {
                            address:
                                "36nrw-cqcch-ea3si-53d3r-d4bep-vcvpf-jcuq7-dgaxh-bk3ss-4plti-5qe",
                            chain: "IC",
                        },
                        to: {
                            address:
                                "rdpcv-vctd4-hb7ni-cy5sq-kroai-ultcg-2dh2j-gqaxj-tczxw-reyry-2qe",
                            chain: "IC",
                        },
                        asset: {
                            address: "x5qut-viaaa-aaaar-qajda-cai",
                            chain: "IC",
                        },
                        amount: 10000000n,
                        state: TRANSACTION_STATE.CREATED,
                    },
                ],
            },
        ],
    };
};

// Map front-end 'Link' model to back-end model
export const MapLinkDetailModelToUpdateLinkInputModel = (
    linkId: string,
    linkDetailModel: LinkDetailModel,
    isContinue: boolean,
): UpdateLinkInput => {
    const updateLinkInput: UpdateLinkInput = {
        id: linkId,
        action: isContinue ? "Continue" : "Back",
        params: [
            {
                Update: {
                    params: [
                        {
                            title: [linkDetailModel.title],
                            asset_info: linkDetailModel.amount
                                ? [Array<AssetInfo>(mapAssetInfo(linkDetailModel))]
                                : [],
                            description: [linkDetailModel.description],
                            template: IS_USE_DEFAULT_LINK_TEMPLATE ? [TEMPLATE.CENTRAL] : [],
                            nft_image: [linkDetailModel.image],
                            link_image_url: ["Test"],
                            link_type: linkDetailModel.linkType ? [linkDetailModel.linkType] : [],
                        },
                    ],
                },
            },
        ],
    };
    return updateLinkInput;
};

export const MapLinkToLinkDetailModel = (link: Link): LinkDetailModel => {
    return {
        id: link.id,
        title: fromNullable(link.title) ?? "",
        description: fromNullable(link.description) ?? "",
        image: fromNullable(link.nft_image) ?? "",
        linkType: fromNullable(link.link_type),
        state: fromNullable(link.state),
        template: fromNullable(link.template),
        creator: fromNullable(link.creator),
        create_at: fromNullable(link.create_at)
            ? convertNanoSecondsToDate(fromDefinedNullable(link.create_at))
            : new Date("2000-10-01"),
        amountNumber: fromNullable(link.asset_info)
            ? Number(fromDefinedNullable(link.asset_info)[0].total_amount)
            : 0,
        amount: fromNullable(link.asset_info)
            ? fromDefinedNullable(link.asset_info)[0].total_amount
            : BigInt(0),
        tokenAddress: fromNullable(link.asset_info)
            ? fromDefinedNullable(link.asset_info)[0].address
            : "",
    };
};

// Map back-end link detail ('GetLinkResp') to Front-end model
export const MapLinkDetailModel = async (linkObj: GetLinkResp): Promise<LinkModel> => {
    const { intent, link } = linkObj;
    return {
        action: generateMockAction(),
        intent_create: fromNullable(intent),
        link: {
            id: link.id,
            title: fromNullable(link.title) ?? "",
            description: fromNullable(link.description) ?? "",
            image: fromNullable(link.nft_image) ?? "",
            linkType: fromNullable(link.link_type),
            state: fromNullable(link.state),
            template: fromNullable(link.template),
            creator: fromNullable(link.creator),
            create_at: fromNullable(link.create_at)
                ? convertNanoSecondsToDate(fromDefinedNullable(link.create_at))
                : new Date("2000-10-01"),
            amountNumber: fromNullable(link.asset_info)
                ? await TokenUtilService.getHumanReadableAmount(
                      fromDefinedNullable(link.asset_info)[0].total_amount,
                      fromDefinedNullable(link.asset_info)[0].address,
                  )
                : 0,
            amount: fromNullable(link.asset_info)
                ? fromDefinedNullable(link.asset_info)[0].total_amount
                : BigInt(0),
            tokenAddress: fromNullable(link.asset_info)
                ? fromDefinedNullable(link.asset_info)[0].address
                : "",
        },
    };
};

/* TODO: Remove testing flag later*/
const IS_TEST_LOCAL_TOKEN = false;
// May need to update in future, now received 'amount' as param, others are constants
const mapAssetInfo = (linkDetailModel: LinkDetailModel): AssetInfo => {
    return {
        address: IS_TEST_LOCAL_TOKEN ? "x5qut-viaaa-aaaar-qajda-cai" : linkDetailModel.tokenAddress,
        chain: CHAIN.IC,
        amount_per_claim: BigInt(1),
        current_amount: linkDetailModel.amount,
        total_amount: linkDetailModel.amount,
        total_claim: BigInt(1),
    };
};
