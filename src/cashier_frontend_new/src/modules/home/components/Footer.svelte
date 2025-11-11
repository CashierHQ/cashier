<script lang="ts">
  import { Mail } from "lucide-svelte";
  import { getAppLinks } from "$modules/shared/constants/links";
  import FooterItem from "./FooterItem.svelte";
  import { locale } from "$lib/i18n";

  // Get translated app links
  const appLinks = $derived(getAppLinks(locale.t));
</script>

<footer
  class="w-full border-t border-border bg-gray-50 text-foreground mt-auto"
>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-3">
    <!-- Mobile view -->
    <div class="flex flex-col gap-6 lg:hidden">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <h3 class="text-xs font-semibold text-foreground mb-2">
            {locale.t("home.footer.company")}
          </h3>
          <ul class="space-y-1">
            <li>
              <FooterItem link={appLinks.aboutCashier} />
            </li>
            <li>
              <FooterItem link={appLinks.team} />
            </li>
            <li>
              <FooterItem link={appLinks.faq} />
            </li>
          </ul>
        </div>
        <div>
          <h3 class="text-xs font-semibold text-foreground mb-2">
            {locale.t("home.footer.legalAndContact")}
          </h3>
          <ul class="space-y-1">
            <li>
              <FooterItem link={appLinks.termsOfService} />
            </li>
            <li>
              <FooterItem link={appLinks.privacyPolicy} />
            </li>
            <li>
              <FooterItem
                link={appLinks.contactEmail}
                target={undefined}
                rel={undefined}
                class="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <Mail class="w-3 h-3" />
              </FooterItem>
            </li>
          </ul>
        </div>
      </div>
      <div
        class="flex flex-col items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3"
      >
        <div class="flex items-center gap-2">
          <span>{locale.t("home.footer.poweredBy")}</span>
          <img alt="ICP" class="w-4 h-4" src="/icpToken.png" />
          <span>{locale.t("home.footer.internetComputer")}</span>
        </div>
        <p>CASHIERFI VENTURES LABS LTD</p>
      </div>
    </div>

    <!-- Desktop view -->
    <div class="hidden lg:flex lg:items-center lg:justify-between">
      <div class="flex items-center gap-6">
        <p class="text-xs text-muted-foreground">CASHIERFI VENTURES LABS LTD</p>
        <div class="flex items-center gap-4 text-xs">
          <FooterItem
            link={appLinks.aboutCashier}
            class="text-muted-foreground hover:text-primary transition-colors"
          />
          <FooterItem
            link={appLinks.team}
            class="text-muted-foreground hover:text-primary transition-colors"
          />
          <FooterItem
            link={appLinks.faq}
            class="text-muted-foreground hover:text-primary transition-colors"
          />
          <span class="text-muted-foreground">|</span>
          <FooterItem
            link={appLinks.termsOfService}
            class="text-muted-foreground hover:text-primary transition-colors"
          />
          <FooterItem
            link={appLinks.privacyPolicy}
            class="text-muted-foreground hover:text-primary transition-colors"
          />
          <span class="text-muted-foreground">|</span>
          <FooterItem
            link={appLinks.contactEmail}
            target={undefined}
            rel={undefined}
            class="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
          >
            <Mail class="w-3 h-3" />
          </FooterItem>
        </div>
      </div>
      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{locale.t("home.footer.poweredBy")}</span>
        <img alt="ICP" class="w-4 h-4" src="/icpToken.png" />
        <span>{locale.t("home.footer.internetComputer")}</span>
      </div>
    </div>
  </div>
</footer>
