<script lang="ts">
  import { authStore } from "../store/auth.store";
  import { trpc } from "../config/trpc";
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import Router from "svelte-spa-router";
  import DashboardLayout from "../lib/components/DashboardLayout.svelte";

  // Import page components
  import MyAccount from "./MyAccount.svelte";
  import RealTimeConsole from "../lib/components/Logger.svelte";
  import SocketTester from "../lib/components/SocketTester.svelte";
  import Scripts from "./Scripts.svelte";
  import Companies from "./Companies/Companies.svelte";
  import Context from "./Context.svelte";
  import Stats from "./Stats.svelte";
  import ProtonMail from "./ProtonMail.svelte";

  let user: any = null;
  let isLoading = true;
  let showSocketTester = false; // Changed to true for always visible

  // Define dashboard routes
  const dashboardRoutes = {
    "/dashboard": MyAccount, // Default to My Account
    "/dashboard/account": MyAccount,
    "/dashboard/scripts": Scripts,
    "/dashboard/companies": Companies,
    "/dashboard/context": Context,
    "/dashboard/stats": Stats,
    "/dashboard/email": ProtonMail,
  };

  onMount(() => {
    const unsubscribe = authStore.subscribe(async (auth) => {
      if (!auth.isAuthenticated || !auth.token) {
        push("/login");
        return;
      }

      // If we already have user data, no need to fetch again
      if (auth.user) {
        user = auth.user;
        isLoading = false;
        return;
      }

      try {
        const userData = await trpc.auth.me.query({});
        user = userData;
        // Update the auth store with the complete user data
        authStore.setUser(userData);
      } catch (error) {
        authStore.logout();
        push("/login");
      } finally {
        isLoading = false;
      }
    });

    return unsubscribe;
  });
</script>

{#if isLoading}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
  </div>
{:else if user}
  <DashboardLayout>
    <Router routes={dashboardRoutes} />
  </DashboardLayout>

  <!-- Real-time Console (always available) -->
  <RealTimeConsole />

  <!-- Socket Tester Toggle Button -->
  <button
    on:click={() => (showSocketTester = !showSocketTester)}
    class="fixed bottom-4 right-20 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg z-50 transition-colors"
    title={showSocketTester ? "Hide Socket Tester" : "Show Socket Tester"}
  >
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {#if showSocketTester}
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      {:else}
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      {/if}
    </svg>
  </button>

  <!-- Socket Communication Tester -->
  {#if showSocketTester}
    <div class="fixed bottom-20 right-4 w-full max-w-md lg:w-1/3 lg:max-w-lg z-40 p-4 lg:p-0">
      <SocketTester />
    </div>
  {/if}
{/if}
