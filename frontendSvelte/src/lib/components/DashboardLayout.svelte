<script lang="ts">
  import Sidebar from "../components/Sidebar.svelte";
  import { location } from "svelte-spa-router";

  export let currentPath = "";

  // Subscribe to route changes
  $: currentPath = $location;
</script>

<div class="flex h-full w-full bg-gray-50">
  <!-- Sidebar -->
  <!-- <div class="fixed inset-y-0 left-0 z-50 flex-shrink-0">
  </div> -->
  <Sidebar {currentPath} />

  <!-- Main content -->
  <main class="flex flex-col h-full p-6 w-full overflow-y-auto">
    <slot />
  </main>
</div>
