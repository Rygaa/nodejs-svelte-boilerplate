<script lang="ts">
  import Router from "svelte-spa-router";
  import { onMount } from "svelte";
  import { authStore } from "./store/auth.store";

  // Import components
  import Login from "./pages/Login.svelte";
  import Signup from "./pages/Signup.svelte";
  import Dashboard from "./pages/Dashboard.svelte";

  const routes = {
    "/": Login,
    "/login": Login,
    "/signup": Signup,
    "/dashboard": Dashboard,
    "/dashboard/*": Dashboard, // Handle all dashboard sub-routes
  };

  onMount(() => {
    // Initialize auth state from localStorage
    authStore.initializeFromStorage();
  });
</script>

<Router {routes} />

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell",
      "Open Sans", "Helvetica Neue", sans-serif;
  }
</style>
