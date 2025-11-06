<script lang="ts">
  import { onMount } from "svelte";
  import { Router, Route, navigate } from "svelte-routing";
  import Signup from "./routes/Signup.svelte";
  import Login from "./routes/Login.svelte";
  import Profile from "./routes/Profile.svelte";
  import Users from "./routes/Admin/Users.svelte";
  import Sidebar from "./lib/components/Sidebar.svelte";
  import { _globalStore } from "./store/globalStore.svelte";
  import { trpc } from "./lib/trpc";

  onMount(async () => {
    const authToken = _globalStore.getAuthToken();
    console.log("No auth token found, redirecting to login");

    if (authToken) {
      const result = await trpc.auth.mutate();
      console.log("Auth mutation result:", result);
      if (result.success) {
        _globalStore.setAuthToken(result.authToken);
        _globalStore.user = result.user;
        // if there is no /profile or /learning route, redirect to /learning
        if (
          !window.location.pathname.startsWith("/profile") &&
          !window.location.pathname.startsWith("/learning") &&
          !window.location.pathname.startsWith("/admin") &&
          !window.location.pathname.startsWith("/users")
        ) {
          navigate("/learning", { replace: true });
        }
      } else {
        _globalStore.setAuthToken(null);
        _globalStore.user = null;
        console.log("No auth token found, redirecting to login");
        if (!window.location.pathname.startsWith("/signup")) {
          navigate("/login", { replace: true });
        }
      }
    } else {
      console.log("No auth token found, redirecting to login");
      if (!window.location.pathname.startsWith("/signup")) {
        navigate("/login", { replace: true });
      }
    }

    _globalStore.isAuthenticating = false;
  });

  // Centralized navigation items
  let isSidebarOpen = $state(true);

  const navigationItems = $derived([
    { name: "Profile", path: "/profile", icon: "👤", section: "main" },
    { name: "Learning", path: "/learning", icon: "📚", section: "main" },
    ...(_globalStore.user?.role === "ADMIN"
      ? [
          { name: "Admin", path: "/admin", icon: "⚙️", variant: "admin" as const },
          { name: "Users", path: "/users", icon: "👥", variant: "admin" as const },
        ]
      : []),
  ]);

  // Handle logout
  function handleLogout() {
    _globalStore.setAuthToken(null);
    _globalStore.user = null;
    navigate("/signup");
  }

  // Check if current route needs sidebar - using $effect to track location changes
  let currentLocation = $state("");
  let shouldShowSidebar = $state(false);

  $effect(() => {
    currentLocation = typeof window !== "undefined" ? window.location.pathname : "";
    shouldShowSidebar =
      !_globalStore.isAuthenticating &&
      _globalStore.user &&
      (currentLocation.startsWith("/profile") ||
        currentLocation.startsWith("/learning") ||
        currentLocation.startsWith("/admin") ||
        currentLocation.startsWith("/users"));
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
  <div class="flex h-full w-full bg-gray-50 overflow-x-hidden">
    <Router>
      {#if shouldShowSidebar}
        <Sidebar title="Residanat" bind:isOpen={isSidebarOpen} {navigationItems} onLogout={handleLogout} />
      {/if}
      <Route path="/signup"><Signup /></Route>
      <Route path="/login"><Login /></Route>
      <Route path="/profile">
        {#if _globalStore.user}
          <Profile />
        {:else}
          {navigate("/signup", { replace: true })}
        {/if}
      </Route>
      <Route path="/users">
        {#if _globalStore.user && _globalStore.user.role === "ADMIN"}
          <Users />
        {:else}
          {navigate("/learning", { replace: true })}
        {/if}
      </Route>
    </Router>
  </div>
{/if}
