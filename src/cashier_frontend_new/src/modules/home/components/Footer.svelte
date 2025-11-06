<script lang="ts">
  import { Mail } from "lucide-svelte";
  import { appLinks } from "$modules/shared/constants/links";
</script>

<footer class="w-full border-t border-border bg-gray-50 text-foreground mt-auto">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-3">
    <!-- Mobile view -->
    <div class="flex flex-col gap-6 lg:hidden">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <h3 class="text-xs font-semibold text-foreground mb-2">Company</h3>
          <ul class="space-y-1">
            <li>
              <a
                href={appLinks.aboutCashier.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {appLinks.aboutCashier.label}
              </a>
            </li>
            <li>
              <a
                href={appLinks.team.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {appLinks.team.label}
              </a>
            </li>
            <li>
              <a
                href={appLinks.faq.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {appLinks.faq.label}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 class="text-xs font-semibold text-foreground mb-2">Legal & Contact</h3>
          <ul class="space-y-1">
            <li>
              <a
                href={appLinks.termsOfService.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {appLinks.termsOfService.label}
              </a>
            </li>
            <li>
              <a
                href={appLinks.privacyPolicy.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {appLinks.privacyPolicy.label}
              </a>
            </li>
            <li>
              <a
                href="mailto:{appLinks.contactEmail.email}"
                class="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <Mail class="w-3 h-3" />
                {appLinks.contactEmail.label}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div class="flex flex-col items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
        <div class="flex items-center gap-2">
          <span>Powered by</span>
          <img alt="ICP" class="w-4 h-4" src="/icpToken.png" />
          <span>Internet Computer</span>
        </div>
        <p>CASHIERFI VENTURES LABS LTD</p>
      </div>
    </div>

    <!-- Desktop view -->
    <div class="hidden lg:flex lg:items-center lg:justify-between">
      <div class="flex items-center gap-6">
        <p class="text-xs text-muted-foreground">CASHIERFI VENTURES LABS LTD</p>
        <div class="flex items-center gap-4 text-xs">
          <a
            href={appLinks.aboutCashier.url}
            target="_blank"
            rel="noopener noreferrer"
            class="text-muted-foreground hover:text-primary transition-colors"
          >
            {appLinks.aboutCashier.label}
          </a>
          <a
            href={appLinks.team.url}
            target="_blank"
            rel="noopener noreferrer"
            class="text-muted-foreground hover:text-primary transition-colors"
          >
            {appLinks.team.label}
          </a>
          <a
            href={appLinks.faq.url}
            target="_blank"
            rel="noopener noreferrer"
            class="text-muted-foreground hover:text-primary transition-colors"
          >
            {appLinks.faq.label}
          </a>
          <span class="text-muted-foreground">|</span>
          <a
            href={appLinks.termsOfService.url}
            target="_blank"
            rel="noopener noreferrer"
            class="text-muted-foreground hover:text-primary transition-colors"
          >
            {appLinks.termsOfService.label}
          </a>
          <a
            href={appLinks.privacyPolicy.url}
            target="_blank"
            rel="noopener noreferrer"
            class="text-muted-foreground hover:text-primary transition-colors"
          >
            {appLinks.privacyPolicy.label}
          </a>
          <span class="text-muted-foreground">|</span>
          <a
            href="mailto:{appLinks.contactEmail.email}"
            class="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
          >
            <Mail class="w-3 h-3" />
            {appLinks.contactEmail.label}
          </a>
        </div>
      </div>
      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Powered by</span>
        <img alt="ICP" class="w-4 h-4" src="/icpToken.png" />
        <span>Internet Computer</span>
      </div>
    </div>
  </div>
</footer>

