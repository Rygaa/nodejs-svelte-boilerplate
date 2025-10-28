<script lang="ts">
  import { onMount } from "svelte";
  import { Router, Route, navigate } from "svelte-routing";
  import Signup from "./routes/Signup.svelte";
  import Login from "./routes/Login.svelte";
  import Profile from "./routes/Profile.svelte";
  import { _globalStore } from "./store/globalStore.svelte";
  import { trpc } from "./lib/trpc";

  onMount(async () => {
    const authToken = _globalStore.getAuthToken();

    if (authToken) {
      const result = await trpc.auth.mutate();

      if (result.success) {
        _globalStore.setAuthToken(result.authToken);
        _globalStore.user = result.user;
      } else {
        _globalStore.setAuthToken(null);
        _globalStore.user = null;
      }
    }

    _globalStore.isAuthenticating = false;
  });
</script>

{#if _globalStore.isAuthenticating}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
{:else}
  <Router>
    <Route path="/signup"><Signup /></Route>
    <Route path="/login"><Login /></Route>
    <Route path="/profile">
      {#if _globalStore.user}
        <Profile />
      {:else}
        {navigate("/signup", { replace: true })}
      {/if}
    </Route>
  </Router>
{/if}
