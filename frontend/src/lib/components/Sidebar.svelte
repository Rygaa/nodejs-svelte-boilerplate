<script lang="ts">
  import { navigate, useLocation } from "svelte-routing";
  import SidebarButton from "./SidebarButton.svelte";

  let {
    title = "Dashboard",
    currentPath = $bindable(""),
    navigationItems = [],
    onLogout = null,
    isOpen = $bindable(true),
  }: {
    title?: string;
    currentPath?: string;
    navigationItems?: Array<{
      name: string;
      path: string;
      icon: string;
      section?: string;
      variant?: "default" | "admin" | "danger";
    }>;
    onLogout?: (() => void) | null;
    isOpen?: boolean;
  } = $props();

  const location = useLocation();

  // Sidebar visibility state
  let isMobileMenuOpen = $state(false);

  // Sync isOpen with parent
  $effect(() => {
    // This allows parent to control sidebar state
  });

  // Subscribe to location changes
  $effect(() => {
    currentPath = $location.pathname || currentPath;
  });

  // Close mobile menu when navigating
  $effect(() => {
    if (currentPath) {
      isMobileMenuOpen = false;
    }
  });

  // Group items by section
  const groupedItems = $derived(
    navigationItems.reduce(
      (acc, item) => {
        const section = item.section || "main";
        if (!acc[section]) {
          acc[section] = [];
        }
        acc[section].push(item);
        return acc;
      },
      {} as Record<string, typeof navigationItems>
    )
  );

  // Get sections in order: main first, then others alphabetically
  const sections = $derived(
    Object.keys(groupedItems).sort((a, b) => {
      if (a === "main") return -1;
      if (b === "main") return 1;
      return a.localeCompare(b);
    })
  );

  function handleLogout() {
    if (onLogout) {
      onLogout();
    }
  }

  function navigateTo(path: string) {
    navigate(path);
  }

  function toggleSidebar() {
    isOpen = !isOpen;
  }

  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  function closeMobileMenu() {
    isMobileMenuOpen = false;
  }

  // Make isActive reactive
  function isActive(path: string) {
    return currentPath === path || currentPath.startsWith(path);
  }
</script>

<!-- Mobile Menu Button (visible only on mobile) -->
<button
  onclick={toggleMobileMenu}
  class="fixed top-4 left-4 z-50 lg:hidden bg-indigo-600 text-white p-2 rounded-lg shadow-lg hover:bg-indigo-700 transition-colors"
  aria-label="Toggle menu"
>
  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {#if isMobileMenuOpen}
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    {:else}
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
    {/if}
  </svg>
</button>

<!-- Desktop Toggle Button (visible only on desktop when sidebar is hidden) -->
{#if !isOpen}
  <button
    onclick={toggleSidebar}
    class="hidden lg:block fixed top-4 left-4 z-40 bg-indigo-600 text-white p-2 rounded-lg shadow-lg hover:bg-indigo-700 transition-colors"
    aria-label="Show sidebar"
  >
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>
{/if}

<!-- Mobile Backdrop Overlay -->
{#if isMobileMenuOpen}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity"
    onclick={closeMobileMenu}
    onkeydown={(e) => (e.key === "Enter" || e.key === "Escape" ? closeMobileMenu() : null)}
    role="button"
    tabindex="0"
    aria-label="Close menu"
  ></div>
{/if}

<!-- Sidebar -->
<div
  class="
    w-64 flex-shrink-0
    bg-white shadow-lg h-full flex flex-col
    fixed lg:static
    top-0 left-0 z-40
    transition-transform duration-300 ease-in-out
  "
  class:translate-x-0={isMobileMenuOpen}
  class:-translate-x-full={!isMobileMenuOpen}
  class:lg:translate-x-0={isOpen}
  class:lg:hidden={!isOpen}
>
  <!-- Logo/Brand with Desktop Hide Button -->
  <div class="flex items-center justify-between h-16 px-4 bg-indigo-600">
    <h1 class="text-xl font-bold text-white">{title}</h1>
    <!-- Desktop Hide Button -->
    <button
      onclick={toggleSidebar}
      class="hidden lg:block text-white hover:bg-indigo-700 p-1 rounded transition-colors"
      aria-label="Hide sidebar"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  </div>

  <!-- Navigation -->
  <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
    {#each sections as section}
      {#if section === "main"}
        <!-- Main Navigation (no header) -->
        {#each groupedItems[section] as item}
          <SidebarButton
            onclick={() => navigateTo(item.path)}
            active={isActive(item.path)}
            variant={item.variant || "default"}
            icon={item.icon}
            text={item.name}
          />
        {/each}
      {:else}
        <!-- Other sections with headers -->
        <div class="pt-4">
          <div class="pb-2">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {section}
            </h3>
          </div>
          {#each groupedItems[section] as item}
            <SidebarButton
              onclick={() => navigateTo(item.path)}
              active={isActive(item.path)}
              variant={item.variant || "default"}
              icon={item.icon}
              text={item.name}
            />
          {/each}
        </div>
      {/if}
    {/each}
  </nav>

  <!-- Logout Button -->
  {#if onLogout}
    <div class="px-4 py-4 border-t border-gray-200">
      <SidebarButton onclick={handleLogout} variant="danger" icon="🚪" text="Logout" />
    </div>
  {/if}
</div>
