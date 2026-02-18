import type { Action } from '$shared';
import {
	ActionType,
	ActionState,
	IntentType,
	IntentState,
	AddressType,
	TokenStandard,
} from '$shared';
import { Principal } from '@dfinity/principal';
import { LinkType } from '$modules/links/types/link/linkType';

// Import action templates - TipLink template used for TIP_SHARED_TEST
import actionsTemplates from '$sharedTemplates/actions.json';

type ActionTemplateJson = {
	link_type?: string;
	id: string;
	creator: string;
	creator_address_type: string;
	action_type: string;
	intents: Array<{
		id: string;
		intent_type: string;
		asset: { address: string; network_fee?: string; token_standard?: string };
		amount: string;
		total_network_fee?: string;
		user_fee?: string;
		total_amount?: string;
		source_address: string;
		source_address_type: string;
		dest_address: string;
		dest_address_type: string;
		dependencies?: string[];
		intent_state: string;
	}>;
	action_state: string;
};

const TEMPLATE_LINK_TYPE_MAP: Record<string, string> = {
	[LinkType.TIP_SHARED_TEST]: 'TipLink',
};

/**
 * Load action template for the given link type from actions.json.
 * Returns the first matching template or null if not found.
 */
function getTemplateForLinkType(
	linkType: string,
): ActionTemplateJson | null {
	const templateLinkType = TEMPLATE_LINK_TYPE_MAP[linkType];
	if (!templateLinkType) return null;

	const templates = actionsTemplates as ActionTemplateJson[];
	return (
		templates.find((t) => t.link_type === templateLinkType) ?? null
	);
}

function parseTokenStandard(
	val?: string,
): (typeof TokenStandard)[keyof typeof TokenStandard] {
	if (val === 'ICRC2') return TokenStandard.ICRC2;
	return TokenStandard.ICRC1;
}

/**
 * Create an Action instance from template, with our id and creator.
 * Intents use placeholder data where actual values are not yet known.
 */
export function createActionFromTemplate(
	linkType: string,
	creator: Principal,
): Action | null {
	const template = getTemplateForLinkType(linkType);
	if (!template || !template.intents || template.intents.length < 2) {
		return null;
	}

	// Use template structure but with our id, creator, and placeholder intents
	const intents = template.intents.map((tIntent) => ({
		id: crypto.randomUUID(),
		intent_type: IntentType.Send,
		asset: {
			address: Principal.fromText(tIntent.asset?.address ?? 'aaaaa-aa'),
			network_fee: tIntent.asset?.network_fee
				? BigInt(tIntent.asset.network_fee)
				: undefined,
			token_standard: parseTokenStandard(tIntent.asset?.token_standard),
		},
		amount: BigInt(tIntent.amount ?? '0'),
		total_network_fee: tIntent.total_network_fee
			? BigInt(tIntent.total_network_fee)
			: undefined,
		user_fee: tIntent.user_fee ? BigInt(tIntent.user_fee) : undefined,
		total_amount: tIntent.total_amount
			? BigInt(tIntent.total_amount)
			: undefined,
		source_address: Principal.fromText(tIntent.source_address ?? template.creator),
		source_address_type:
			tIntent.source_address_type === 'Creator'
				? AddressType.Creator
				: tIntent.source_address_type === 'Treasury'
					? AddressType.Treasury
					: tIntent.source_address_type === 'User'
						? AddressType.User
						: AddressType.Link,
		dest_address: Principal.fromText(tIntent.dest_address ?? template.creator),
		dest_address_type:
			tIntent.dest_address_type === 'Link'
				? AddressType.Link
				: tIntent.dest_address_type === 'Treasury'
					? AddressType.Treasury
					: tIntent.dest_address_type === 'User'
						? AddressType.User
						: AddressType.Creator,
		dependencies: tIntent.dependencies ?? [],
		intent_state: IntentState.Created,
	}));

	return {
		id: crypto.randomUUID(),
		creator,
		creator_address_type:
			template.creator_address_type === 'Creator'
				? AddressType.Creator
				: AddressType.User,
		action_type:
			template.action_type === 'CreateLink'
				? ActionType.CreateLink
				: ActionType.Receive,
		intents,
		action_state: ActionState.Created,
	};
}
