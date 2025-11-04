<script lang="ts">
  import { Mail } from "lucide-svelte";
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
                href="https://doc.clickup.com/9012452868/d/h/8cjy7g4-4292/9a3796b6e853ef0"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                About Cashier
              </a>
            </li>
            <li>
              <a
                href="https://doc.clickup.com/9012452868/d/h/8cjy7g4-4792/cd2e9646a3a8a0a"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Team
              </a>
            </li>
            <li>
              <a
                href="https://doc.clickup.com/9012452868/d/h/8cjy7g4-4812/2b32fa3ed781459"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                FAQ
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 class="text-xs font-semibold text-foreground mb-2">Legal & Contact</h3>
          <ul class="space-y-1">
            <li>
              <a
                href="https://doc.clickup.com/9012452868/d/h/8cjy7g4-7212/01084c48b7877f0"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Terms of Service
              </a>
            </li>
            <li>
              <a
                href="https://doc.clickup.com/9012452868/d/h/8cjy7g4-7232/38befdcfae1af1b"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Privacy Policy
              </a>
            </li>
            <li>
              <a
                href="mailto:contact@cashierapp.io"
                class="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <Mail class="w-3 h-3" />
                Contact Email
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
            href="https://doc.clickup.com/9012452868/d/h/8cjy7g4-4292/9a3796b6e853ef0"
            target="_blank"
            rel="noopener noreferrer"
            class="text-muted-foreground hover:text-primary transition-colors"
          >
            About Cashier
          </a>
          <a
            href="https://doc.clickup.com/9012452868/d/h/8cjy7g4-4792/cd2e9646a3a8a0a"
            target="_blank"
            rel="noopener noreferrer"
            class="text-muted-foreground hover:text-primary transition-colors"
          >
            Team
          </a>
          <a
            href="https://doc.clickup.com/9012452868/d/h/8cjy7g4-4812/2b32fa3ed781459"
            target="_blank"
            rel="noopener noreferrer"
            class="text-muted-foreground hover:text-primary transition-colors"
          >
            FAQ
          </a>
          <span class="text-muted-foreground">|</span>
          <a
            href="https://doc.clickup.com/9012452868/d/h/8cjy7g4-7212/01084c48b7877f0"
            target="_blank"
            rel="noopener noreferrer"
            class="text-muted-foreground hover:text-primary transition-colors"
          >
            Terms of Service
          </a>
          <a
            href="https://doc.clickup.com/9012452868/d/h/8cjy7g4-7232/38befdcfae1af1b"
            target="_blank"
            rel="noopener noreferrer"
            class="text-muted-foreground hover:text-primary transition-colors"
          >
            Privacy Policy
          </a>
          <span class="text-muted-foreground">|</span>
          <a
            href="mailto:contact@cashierapp.io"
            class="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
          >
            <Mail class="w-3 h-3" />
            Contact Email
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
