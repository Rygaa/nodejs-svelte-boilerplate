<script lang="ts">
  import Icon from "./Icon.svelte";

  let {
    selectedIcon = $bindable(""),
    label = "Select Icon",
    class: className = "",
  }: {
    selectedIcon?: string;
    label?: string;
    class?: string;
  } = $props();

  let isOpen = $state(false);
  let searchQuery = $state("");

  // Load all icons from the assets/icons folder
  const iconModules = import.meta.glob("../../assets/icons/*.svg", {
    query: "?raw",
    import: "default",
  });

  const availableIcons = Object.keys(iconModules)
    .map((path) => {
      return path.split("/").pop()?.replace(".svg", "") || "";
    })
    .filter(Boolean)
    .sort();

  const filteredIcons = $derived(
    availableIcons.filter((icon) => icon.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  function selectIcon(iconName: string) {
    selectedIcon = iconName;
    isOpen = false;
    searchQuery = "";
  }

  function toggleDropdown() {
    isOpen = !isOpen;
    if (!isOpen) {
      searchQuery = "";
    }
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest(".icon-selector-container")) {
      isOpen = false;
      searchQuery = "";
    }
  }

  $effect(() => {
    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  });
</script>

<div class="icon-selector-container {className}">
  {#if label}
    <label class="block text-sm font-medium text-gray-700 mb-2">
      {label}
    </label>
  {/if}

  <div class="relative">
    <!-- Selected Icon Display -->
    <button
      type="button"
      onclick={toggleDropdown}
      class="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
    >
      <div class="flex items-center gap-3">
        {#if selectedIcon}
          <Icon iconName={selectedIcon} size={24} />
          <span class="text-sm text-gray-900">{selectedIcon}</span>
        {:else}
          <span class="text-sm text-gray-500">No icon selected</span>
        {/if}
      </div>
      <svg
        class="w-5 h-5 text-gray-400 transition-transform {isOpen ? 'rotate-180' : ''}"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fill-rule="evenodd"
          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          clip-rule="evenodd"
        ></path>
      </svg>
    </button>

    <!-- Dropdown -->
    {#if isOpen}
      <div
        class="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden"
      >
        <!-- Search -->
        <div class="p-3 border-b border-gray-200 sticky top-0 bg-white">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clip-rule="evenodd"
                ></path>
              </svg>
            </div>
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Search icons..."
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              onclick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        <!-- Icon Grid -->
        <div class="p-3 overflow-y-auto max-h-80">
          {#if filteredIcons.length > 0}
            <div class="grid grid-cols-4 gap-2">
              {#each filteredIcons as iconName}
                <button
                  type="button"
                  onclick={() => selectIcon(iconName)}
                  class="flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all {selectedIcon ===
                  iconName
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}"
                  title={iconName}
                >
                  <Icon {iconName} size={32} />
                  <span class="text-xs text-gray-600 truncate w-full text-center">
                    {iconName}
                  </span>
                </button>
              {/each}
            </div>
          {:else}
            <div class="text-center py-8 text-gray-400">
              <svg class="mx-auto h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <p class="text-sm">No icons found</p>
            </div>
          {/if}
        </div>

        <!-- Footer -->
        <div class="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 text-center">
          {filteredIcons.length} icon{filteredIcons.length !== 1 ? "s" : ""} available
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .icon-selector-container {
    position: relative;
  }
</style>
