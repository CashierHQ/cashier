<script lang="ts">
  import { page } from "$app/state";
</script>

<div class="flex items-center justify-center min-h-screen bg-gray-50">
  <div class="text-center">
    <h1 class="text-6xl font-bold text-gray-900 mb-4">
      {page.status}
    </h1>
    <p class="text-xl text-gray-600 mb-8">
      {page.error?.message || "An error occurred"}
    </p>
    <a
      href="/"
      class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      Go Home
    </a>
  </div>
</div>
