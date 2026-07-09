import coinTokenIcon from "$lib/assets/gating/coin-token-icon.svg";
import quizIcon from "$lib/assets/gating/quiz-icon.svg";
import telegramIcon from "$lib/assets/telegram-icon.svg";
import xIcon from "$lib/assets/x-icon.svg";
import { locale } from "$lib/i18n";
import { GateType } from "$modules/gating/types/gate";
import { MessageSquareMore, RectangleEllipsis } from "lucide-svelte";
import { COUNTRY_DIAL_CODES } from "$modules/shared/data/countries";
import { getPhoneDialCode } from "$modules/shared/services/phoneNumber";

export const FALLBACK_LOCK_VALUE_LENGTH = 12;
export const X_HANDLE_LOCK_TYPE = "xHandle";
export const OTP_EXPIRY_SECONDS = 10 * 60;

export const OTP_TYPE = GateType.OTP_EMAIL;

export const GATE_OPTIONS = [
  {
    type: GateType.PASSWORD,
    label: locale.t("links.linkForm.lock.password"),
    enabled: true,
    iconComponent: RectangleEllipsis,
  },
  {
    type: GateType.X_FOLLOWING,
    label: locale.t("links.linkForm.lock.xHandle"),
    enabled: true,
    iconSrc: xIcon,
  },
  {
    type: OTP_TYPE,
    label: locale.t("links.linkForm.lock.otp.oneTimeCodeVerification"),
    enabled: true,
    iconComponent: MessageSquareMore,
  },
  {
    label: locale.t("links.linkForm.lock.telegramGroup"),
    enabled: false,
    iconSrc: telegramIcon,
    hidden: true,
  },
  {
    label: locale.t("links.linkForm.lock.tokenOrNftOwnership"),
    enabled: false,
    iconSrc: coinTokenIcon,
    hidden: true,
  },
  {
    label: locale.t("links.linkForm.lock.quizMultipleChoice"),
    enabled: false,
    iconSrc: quizIcon,
    hidden: true,
  },
];

export const DOTS = "•••••";

export const DIAL_CODES_SORTED = COUNTRY_DIAL_CODES.map((c) =>
  getPhoneDialCode(c.code, c.dialCode),
).sort((a, b) => b.length - a.length);
