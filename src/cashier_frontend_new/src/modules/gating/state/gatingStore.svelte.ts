import { locale } from "$lib/i18n";
import { GateType, type GateDraft } from "$modules/gating/types/gate";
import { isValidPhoneNumber } from "libphonenumber-js/min";

const TWEET_URL_PATTERN = /^https:\/\/x\.com\/.+\/status\/\d+$/;

export class GatingStore {
  #selectedGateTypes = $state<GateType[]>([]);
  #password = $state("");
  #confirmPassword = $state("");
  #configuredPassword = $state<string | null>(null);
  #xFollowingHandle = $state<string | null>(null);
  #xFollowingDraft = $state("");
  #xRewardAccountDraft = $state("");
  #xOwnedAccountHandle = $state<string | null>(null);
  #xOwnedAccountDraft = $state("");
  #xLikedPostUrl = $state<string | null>(null);
  #xLikedPostDraft = $state("");
  #xRetweetedPostUrl = $state<string | null>(null);
  #xRetweetedPostDraft = $state("");
  #otpEmail = $state<string | null>(null);
  #otpEmailDraft = $state("");
  #otpEmailConfirmDraft = $state("");
  #otpPhone = $state<string | null>(null);
  #otpPhoneDraft = $state("");
  #otpPhoneConfirmDraft = $state("");
  #otpPhoneDigits = $state("");
  #otpPhoneConfirmDigits = $state("");
  #otpCountryCode = $state("");

  #removeSelectedGateType(type: GateType): void {
    this.#selectedGateTypes = this.#selectedGateTypes.filter(
      (selectedType) => selectedType !== type,
    );
  }

  get selectedGateTypes(): GateType[] {
    return this.#selectedGateTypes;
  }

  get password(): string {
    return this.#password;
  }

  get confirmPassword(): string {
    return this.#confirmPassword;
  }

  get xFollowingDraft(): string {
    return this.#xFollowingDraft;
  }

  get xRewardAccountDraft(): string {
    return this.#xRewardAccountDraft;
  }

  get xOwnedAccountDraft(): string {
    return this.#xOwnedAccountDraft;
  }

  get xLikedPostDraft(): string {
    return this.#xLikedPostDraft;
  }

  get xRetweetedPostDraft(): string {
    return this.#xRetweetedPostDraft;
  }

  get hasConfiguredPassword(): boolean {
    return this.#configuredPassword !== null;
  }

  get hasConfiguredXFollowing(): boolean {
    return this.#xFollowingHandle !== null;
  }

  get hasConfiguredXOwnedAccount(): boolean {
    return this.#xOwnedAccountHandle !== null;
  }

  get hasConfiguredXLikedPost(): boolean {
    return this.#xLikedPostUrl !== null;
  }

  get hasConfiguredXRetweetedPost(): boolean {
    return this.#xRetweetedPostUrl !== null;
  }

  get xFollowingHandle(): string | null {
    return this.#xFollowingHandle;
  }

  get xOwnedAccountHandle(): string | null {
    return this.#xOwnedAccountHandle;
  }

  get xLikedPostUrl(): string | null {
    return this.#xLikedPostUrl;
  }

  get xRetweetedPostUrl(): string | null {
    return this.#xRetweetedPostUrl;
  }

  get hasConfiguredOTPEmail(): boolean {
    return this.#otpEmail !== null;
  }

  get hasConfiguredOTPSms(): boolean {
    return this.#otpPhone !== null;
  }

  get otpEmail(): string | null {
    return this.#otpEmail;
  }

  get otpPhone(): string | null {
    return this.#otpPhone;
  }

  get otpPhoneDigits(): string {
    return this.#otpPhoneDigits;
  }

  get otpPhoneConfirmDigits(): string {
    return this.#otpPhoneConfirmDigits;
  }

  get otpCountryCode(): string {
    return this.#otpCountryCode;
  }

  get otpEmailDraft(): string {
    return this.#otpEmailDraft;
  }

  get otpEmailConfirmDraft(): string {
    return this.#otpEmailConfirmDraft;
  }

  get otpPhoneDraft(): string {
    return this.#otpPhoneDraft;
  }

  get otpPhoneConfirmDraft(): string {
    return this.#otpPhoneConfirmDraft;
  }

  get hasConfiguredAnyX(): boolean {
    return (
      this.hasConfiguredXFollowing ||
      this.hasConfiguredXOwnedAccount ||
      this.hasConfiguredXLikedPost ||
      this.hasConfiguredXRetweetedPost
    );
  }

  get hasLocks(): boolean {
    return (
      this.hasConfiguredPassword ||
      this.hasConfiguredXFollowing ||
      this.hasConfiguredXOwnedAccount ||
      this.hasConfiguredXLikedPost ||
      this.hasConfiguredXRetweetedPost ||
      this.hasConfiguredOTPEmail ||
      this.hasConfiguredOTPSms
    );
  }

  get otpEmailSetupError(): string | null {
    const email = this.#otpEmailDraft.trim();
    if (email.length === 0) {
      return locale.t("links.linkForm.lock.otp.errors.emailRequired");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return locale.t("links.linkForm.lock.otp.errors.emailInvalid");
    if (email !== this.#otpEmailConfirmDraft.trim()) {
      return locale.t("links.linkForm.lock.otp.errors.emailsDifferent");
    }
    return null;
  }

  get otpPhoneSetupError(): string | null {
    const phone = this.#otpPhoneDraft.trim();
    if (phone.length === 0) {
      return locale.t("links.linkForm.lock.otp.errors.phoneRequired");
    }
    if (!isValidPhoneNumber(phone))
      return locale.t("links.linkForm.lock.otp.errors.phoneInvalid");
    if (phone !== this.#otpPhoneConfirmDraft.trim()) {
      return locale.t("links.linkForm.lock.otp.errors.phoneNumbersDifferent");
    }
    return null;
  }

  get passwordSetupError(): string | null {
    if (this.#password.trim().length === 0) {
      return locale.t("links.linkForm.lock.errors.passwordRequired");
    }
    if (this.#confirmPassword.trim().length === 0) {
      return locale.t("links.linkForm.lock.errors.confirmPasswordRequired");
    }
    if (this.#password !== this.#confirmPassword) {
      return locale.t("links.linkForm.lock.errors.passwordsDifferent");
    }
    return null;
  }

  get xFollowingSetupError(): string | null {
    if (this.#xFollowingDraft.trim().length === 0) {
      return (
        locale.t("links.linkForm.lock.errors.xHandleRequired") ??
        "X handle is required"
      );
    }
    return null;
  }

  get xOwnedAccountSetupError(): string | null {
    if (this.#xOwnedAccountDraft.trim().length === 0) {
      return (
        locale.t("links.linkForm.lock.errors.xHandleRequired") ??
        "X handle is required"
      );
    }
    return null;
  }

  get xLikedPostSetupError(): string | null {
    const url = this.#xLikedPostDraft.trim();
    if (url.length === 0) {
      return (
        locale.t("links.linkForm.lock.errors.tweetUrlRequired") ??
        "Tweet URL is required"
      );
    }
    if (!TWEET_URL_PATTERN.test(url)) {
      return (
        locale.t("links.linkForm.lock.errors.tweetUrlInvalid") ??
        "Enter a valid X post URL"
      );
    }
    return null;
  }

  get xRetweetedPostSetupError(): string | null {
    const url = this.#xRetweetedPostDraft.trim();
    if (url.length === 0) {
      return (
        locale.t("links.linkForm.lock.errors.tweetUrlRequired") ??
        "Tweet URL is required"
      );
    }
    if (!TWEET_URL_PATTERN.test(url)) {
      return (
        locale.t("links.linkForm.lock.errors.tweetUrlInvalid") ??
        "Enter a valid X post URL"
      );
    }
    return null;
  }

  get gateDrafts(): GateDraft[] {
    const gates: GateDraft[] = [];

    if (this.hasConfiguredPassword) {
      gates.push({
        type: GateType.PASSWORD,
        password: this.#configuredPassword ?? "",
      });
    }

    if (this.hasConfiguredXOwnedAccount) {
      gates.push({
        type: GateType.X_OWNED_ACCOUNT,
        targetHandle: this.#xOwnedAccountHandle ?? "",
      });
    }

    if (this.hasConfiguredXFollowing) {
      gates.push({
        type: GateType.X_FOLLOWING,
        targetHandle: this.#xFollowingHandle ?? "",
        rewardAccount: this.#xRewardAccountDraft,
      });
    }

    if (this.hasConfiguredXLikedPost) {
      gates.push({
        type: GateType.X_LIKED_POST,
        tweetUrl: this.#xLikedPostUrl ?? "",
      });
    }

    if (this.hasConfiguredXRetweetedPost) {
      gates.push({
        type: GateType.X_RETWEETED_POST,
        tweetUrl: this.#xRetweetedPostUrl ?? "",
      });
    }

    if (this.hasConfiguredOTPEmail) {
      gates.push({
        type: GateType.OTP_EMAIL,
        email: this.#otpEmail ?? "",
      });
    }

    if (this.hasConfiguredOTPSms) {
      gates.push({
        type: GateType.OTP_SMS,
        phone: this.#otpPhone ?? "",
        digits: this.#otpPhoneDigits,
        countryCode: this.#otpCountryCode,
      });
    }

    return gates;
  }

  loadGateDraft(gateDraft: GateDraft | null): void {
    this.loadGateDrafts(gateDraft ? [gateDraft] : []);
  }

  loadGateDrafts(gateDrafts: GateDraft[]): void {
    this.resetAll();

    for (const gateDraft of gateDrafts) {
      if (!this.#selectedGateTypes.includes(gateDraft.type)) {
        this.#selectedGateTypes = [...this.#selectedGateTypes, gateDraft.type];
      }

      switch (gateDraft.type) {
        case GateType.PASSWORD:
          this.#configuredPassword = gateDraft.password;
          this.#password = gateDraft.password;
          this.#confirmPassword = gateDraft.password;
          break;
        case GateType.X_FOLLOWING:
          this.#xFollowingHandle = gateDraft.targetHandle;
          this.#xFollowingDraft = gateDraft.targetHandle;
          this.#xRewardAccountDraft = gateDraft.rewardAccount;
          break;
        case GateType.X_OWNED_ACCOUNT:
          this.#xOwnedAccountHandle = gateDraft.targetHandle;
          this.#xOwnedAccountDraft = gateDraft.targetHandle;
          break;
        case GateType.X_LIKED_POST:
          this.#xLikedPostUrl = gateDraft.tweetUrl;
          this.#xLikedPostDraft = gateDraft.tweetUrl;
          break;
        case GateType.X_RETWEETED_POST:
          this.#xRetweetedPostUrl = gateDraft.tweetUrl;
          this.#xRetweetedPostDraft = gateDraft.tweetUrl;
          break;
        case GateType.OTP_EMAIL:
          this.#otpEmail = gateDraft.email;
          this.#otpEmailDraft = gateDraft.email;
          this.#otpEmailConfirmDraft = gateDraft.email;
          break;
        case GateType.OTP_SMS:
          this.#otpPhone = gateDraft.phone;
          this.#otpPhoneDraft = gateDraft.phone;
          this.#otpPhoneConfirmDraft = gateDraft.phone;
          this.#otpPhoneDigits = gateDraft.digits;
          this.#otpPhoneConfirmDigits = gateDraft.digits;
          this.#otpCountryCode = gateDraft.countryCode;
          break;
      }
    }
  }

  setPassword(password: string): void {
    this.#password = password;
  }

  setConfirmPassword(confirmPassword: string): void {
    this.#confirmPassword = confirmPassword;
  }

  setXFollowingDraft(handle: string): void {
    this.#xFollowingDraft = handle.startsWith("@") ? handle.slice(1) : handle;
  }

  setXRewardAccountDraft(handle: string): void {
    this.#xRewardAccountDraft = handle.startsWith("@")
      ? handle.slice(1)
      : handle;
  }

  setXOwnedAccountDraft(handle: string): void {
    this.#xOwnedAccountDraft = handle.startsWith("@")
      ? handle.slice(1)
      : handle;
  }

  setXLikedPostDraft(url: string): void {
    this.#xLikedPostDraft = url;
  }

  setXRetweetedPostDraft(url: string): void {
    this.#xRetweetedPostDraft = url;
  }

  savePasswordLock(): void {
    if (this.passwordSetupError) return;

    this.#configuredPassword = this.#password.trim();
    if (!this.#selectedGateTypes.includes(GateType.PASSWORD)) {
      this.#selectedGateTypes = [...this.#selectedGateTypes, GateType.PASSWORD];
    }
  }

  saveXFollowingLock(): void {
    if (this.xFollowingSetupError) return;

    this.#xFollowingHandle = this.#xFollowingDraft.trim();
    if (!this.#selectedGateTypes.includes(GateType.X_FOLLOWING)) {
      this.#selectedGateTypes = [
        ...this.#selectedGateTypes,
        GateType.X_FOLLOWING,
      ];
    }
  }

  saveXOwnedAccountLock(): void {
    if (this.xOwnedAccountSetupError) return;

    this.#xOwnedAccountHandle = this.#xOwnedAccountDraft.trim();
    if (!this.#selectedGateTypes.includes(GateType.X_OWNED_ACCOUNT)) {
      this.#selectedGateTypes = [
        ...this.#selectedGateTypes,
        GateType.X_OWNED_ACCOUNT,
      ];
    }
  }

  saveXLikedPostLock(): void {
    if (this.xLikedPostSetupError) return;

    this.#xLikedPostUrl = this.#xLikedPostDraft.trim();
    if (!this.#selectedGateTypes.includes(GateType.X_LIKED_POST)) {
      this.#selectedGateTypes = [
        ...this.#selectedGateTypes,
        GateType.X_LIKED_POST,
      ];
    }
  }

  saveXRetweetedPostLock(): void {
    if (this.xRetweetedPostSetupError) return;

    this.#xRetweetedPostUrl = this.#xRetweetedPostDraft.trim();
    if (!this.#selectedGateTypes.includes(GateType.X_RETWEETED_POST)) {
      this.#selectedGateTypes = [
        ...this.#selectedGateTypes,
        GateType.X_RETWEETED_POST,
      ];
    }
  }

  clearPasswordDraft(): void {
    this.#password = "";
    this.#confirmPassword = "";
  }

  removePasswordLock(): void {
    this.#removeSelectedGateType(GateType.PASSWORD);
    this.#configuredPassword = null;
    this.clearPasswordDraft();
  }

  clearXFollowingDraft(): void {
    this.#xFollowingDraft = "";
    this.#xRewardAccountDraft = "";
  }

  clearXOwnedAccountDraft(): void {
    this.#xOwnedAccountDraft = "";
  }

  clearXLikedPostDraft(): void {
    this.#xLikedPostDraft = "";
  }

  clearXRetweetedPostDraft(): void {
    this.#xRetweetedPostDraft = "";
  }

  removeXLocks(): void {
    this.#selectedGateTypes = this.#selectedGateTypes.filter(
      (selectedType) =>
        selectedType !== GateType.X_FOLLOWING &&
        selectedType !== GateType.X_OWNED_ACCOUNT &&
        selectedType !== GateType.X_LIKED_POST &&
        selectedType !== GateType.X_RETWEETED_POST,
    );
    this.#xFollowingHandle = null;
    this.#xOwnedAccountHandle = null;
    this.#xLikedPostUrl = null;
    this.#xRetweetedPostUrl = null;
    this.clearXFollowingDraft();
    this.clearXOwnedAccountDraft();
    this.clearXLikedPostDraft();
    this.clearXRetweetedPostDraft();
  }

  setOTPEmailDraft(email: string): void {
    this.#otpEmailDraft = email;
  }

  setOTPEmailConfirmDraft(email: string): void {
    this.#otpEmailConfirmDraft = email;
  }

  setOTPPhoneDraft(phone: string): void {
    this.#otpPhoneDraft = phone;
  }

  setOTPPhoneConfirmDraft(phone: string): void {
    this.#otpPhoneConfirmDraft = phone;
  }

  setOTPPhoneConfirmDigits(digits: string): void {
    this.#otpPhoneConfirmDigits = digits;
  }

  saveOTPEmailLock(): void {
    if (this.otpEmailSetupError) return;
    this.#otpEmail = this.#otpEmailDraft.trim();
    if (!this.#selectedGateTypes.includes(GateType.OTP_EMAIL)) {
      this.#selectedGateTypes = [
        ...this.#selectedGateTypes,
        GateType.OTP_EMAIL,
      ];
    }
  }

  saveOTPSmsLock(phoneDigits: string, countryCode: string): void {
    if (this.otpPhoneSetupError) return;
    this.#otpPhone = this.#otpPhoneDraft.trim();
    this.#otpPhoneDigits = phoneDigits;
    this.#otpCountryCode = countryCode;
    if (!this.#selectedGateTypes.includes(GateType.OTP_SMS)) {
      this.#selectedGateTypes = [...this.#selectedGateTypes, GateType.OTP_SMS];
    }
  }

  clearOTPEmailDraft(): void {
    this.#otpEmailDraft = "";
    this.#otpEmailConfirmDraft = "";
  }

  removeOTPEmailLock(): void {
    this.#removeSelectedGateType(GateType.OTP_EMAIL);
    this.#otpEmail = null;
    this.clearOTPEmailDraft();
  }

  clearOTPPhoneDraft(): void {
    this.#otpPhoneDraft = "";
    this.#otpPhoneConfirmDraft = "";
    this.#otpPhoneDigits = "";
    this.#otpPhoneConfirmDigits = "";
  }

  removeOTPSmsLock(): void {
    this.#removeSelectedGateType(GateType.OTP_SMS);
    this.#otpPhone = null;
    this.clearOTPPhoneDraft();
    this.#otpCountryCode = "";
  }

  resetAll(): void {
    this.#selectedGateTypes = [];
    this.#password = "";
    this.#confirmPassword = "";
    this.#configuredPassword = null;
    this.#xFollowingHandle = null;
    this.#xFollowingDraft = "";
    this.#xRewardAccountDraft = "";
    this.#xOwnedAccountHandle = null;
    this.#xOwnedAccountDraft = "";
    this.#xLikedPostUrl = null;
    this.#xLikedPostDraft = "";
    this.#xRetweetedPostUrl = null;
    this.#xRetweetedPostDraft = "";
    this.#otpEmail = null;
    this.#otpEmailDraft = "";
    this.#otpEmailConfirmDraft = "";
    this.#otpPhone = null;
    this.#otpPhoneDraft = "";
    this.#otpPhoneConfirmDraft = "";
    this.#otpPhoneDigits = "";
    this.#otpPhoneConfirmDigits = "";
    this.#otpCountryCode = "";
  }
}
