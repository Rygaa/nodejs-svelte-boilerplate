<script lang="ts">
  import { push, location } from "svelte-spa-router";
  import { authStore } from "../../store/auth.store";
  import { onMount, onDestroy } from "svelte";
  import SidebarButton from "./SidebarButton.svelte";

  export let currentPath: string = "";

  let currentUser: any = null;
  let unsubscribe: (() => void) | null = null;

  // Subscribe to auth store to get current user
  onMount(() => {
    unsubscribe = authStore.subscribe((auth) => {
      currentUser = auth.user;
    });
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  // Subscribe directly to location changes for more reliable reactivity
  // This ensures the component always has the latest path regardless of prop updates
  $: currentPath = $location || currentPath;

  const baseNavigationItems = [
    {
      name: "Companies",
      path: "/dashboard/companies",
      icon: "🏢",
    },
    {
      name: "Context",
      path: "/dashboard/context",
      icon: "�",
    },
  ];

  const rootOnlyItems = [
    {
      name: "Scripts",
      path: "/dashboard/scripts",
      icon: "📜",
      requiredRole: "ROOT",
    },
    {
      name: "User Management",
      path: "/dashboard/users",
      icon: "👥",
      requiredRole: "ROOT",
    },
  ];

  const accountItems = [
    {
      name: "My Account",
      path: "/dashboard/account",
      icon: "👤",
    },
  ];

  // Computed navigation items based on user role
  $: navigationItems = [
    ...baseNavigationItems,
    ...(currentUser?.role === "ROOT" ? rootOnlyItems : []),
    ...accountItems,
  ];

  function handleLogout() {
    authStore.logout();
    push("/login");
  }

  function navigateTo(path: string) {
    push(path);
  }

  // Reactive statement to log when currentPath changes
  $: {
  }

  // Make isActive reactive by creating a reactive function
  $: isActive = (path: string) => {
    const active = currentPath === path || currentPath.startsWith(path);

    return active;
  };
</script>

<div class="w-64 bg-white shadow-lg h-full flex flex-col h-full">
  <!-- Logo/Brand -->
  <div class="flex items-center justify-center h-16 px-4 bg-indigo-600">
    <h1 class="text-xl font-bold text-white">AIM Dashboard</h1>
  </div>

  <!-- Navigation -->
  <nav class="flex-1 px-4 py-6 space-y-2">
    <!-- Main Navigation -->
    {#each baseNavigationItems as item}
      <SidebarButton
        on:click={() => navigateTo(item.path)}
        active={isActive(item.path)}
        variant="default"
        icon={item.icon}
        text={item.name}
      />
    {/each}

    <!-- Admin Section (ROOT only) -->
    {#if currentUser?.role === "ROOT"}
      <div class="pt-4">
        <div class="pb-2">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Administration</h3>
        </div>
        {#each rootOnlyItems as item}
          <SidebarButton
            on:click={() => navigateTo(item.path)}
            active={isActive(item.path)}
            variant="admin"
            icon={item.icon}
            text={item.name}
          />
        {/each}
      </div>
    {/if}

    <!-- Account Section -->
    <div class="pt-4">
      <div class="pb-2">
        <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</h3>
      </div>
      {#each accountItems as item}
        <SidebarButton
          on:click={() => navigateTo(item.path)}
          active={isActive(item.path)}
          variant="default"
          icon={item.icon}
          text={item.name}
        />
      {/each}
    </div>
  </nav>

  <!-- Logout Button -->
  <div class="px-4 py-4 border-t border-gray-200">
    <SidebarButton on:click={handleLogout} variant="danger" icon="🚪" text="Logout" />
  </div>
</div>
