<script lang="ts">
  import { onMount } from "svelte";
  import { authStore } from "../store/auth.store";
  import { trpc } from "../config/trpc";
  import DataGrid from "../lib/components/DataGrid.svelte";
  import AvailableHeightContainer from "../lib/components/AvailableHeightContainer.svelte";
  import Button from "../lib/components/Button.svelte";

  interface Filter {
    id: string;
    type: string;
    value: string;
    bucketName: string | null;
    details: string | null;
    createdAt: string;
  }

  let isLoading = true;
  let error = "";
  let filters: Filter[] = [];
  let filteredFilters: Filter[] = [];
  let selectedFilterType = "ALL";
  let currentUser: any = null;

  // Get unique filter types
  $: filterTypes = [...new Set(filters.map((f) => f.type))].sort();

  // Filter filters based on selected type
  $: {
    if (selectedFilterType === "ALL") {
      filteredFilters = filters;
    } else {
      filteredFilters = filters.filter((f) => f.type === selectedFilterType);
    }
  }

  async function loadFilters() {
    try {
      isLoading = true;
      error = "";
      const result = await trpc.filter.getFilters.query({
        limit: 1000,
        offset: 0,
      });
      filters = result.filters;
    } catch (err: any) {
      error = err?.message || "Failed to load filters";
    } finally {
      isLoading = false;
    }
  }

  function getTypeDisplayName(type: string): string {
    const displayNames: Record<string, string> = {
      headcount: "Company Size",
      company_type: "Company Type",
      keyword: "Keywords",
      country: "Countries",
      city: "Cities",
    };
    return displayNames[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  function getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      headcount: "bg-blue-100 text-blue-800",
      company_type: "bg-green-100 text-green-800",
      keyword: "bg-purple-100 text-purple-800",
      country: "bg-orange-100 text-orange-800",
      city: "bg-pink-100 text-pink-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  }

  // Column labels for DataGrid
  const columnLabels: Record<keyof Filter, string> = {
    id: "ID",
    type: "Type",
    value: "Value",
    bucketName: "Bucket",
    details: "Details",
    createdAt: "Created",
  };

  onMount(() => {
    const unsubscribe = authStore.subscribe((auth) => {
      currentUser = auth.user;
      if (auth.isAuthenticated && auth.user?.role === "ROOT") {
        loadFilters();
      } else if (auth.isAuthenticated && auth.user) {
        error = "Access denied: Only ROOT users can access the Filters page";
        isLoading = false;
      }
    });

    return unsubscribe;
  });
</script>

<div class="mb-6">
  <h1 class="text-2xl font-bold text-gray-900 mb-2">Filters</h1>
  <p class="text-gray-600">Manage filters used for company discovery.</p>
</div>

{#if error}
  <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
    <div class="flex">
      <span class="text-red-500 text-xl mr-3">❌</span>
      <div>
        <h3 class="text-sm font-medium text-red-800">Error</h3>
        <p class="text-sm text-red-700">{error}</p>
      </div>
    </div>
  </div>
{/if}

<!-- Available Filters -->
<div class="bg-white shadow rounded-lg p-4 mb-6">
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-4">
      <h2 class="text-lg font-medium text-gray-900">Filters ({filteredFilters.length})</h2>

      <!-- Filter Type Selector -->
      <select
        bind:value={selectedFilterType}
        class="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      >
        <option value="ALL">All Types ({filters.length})</option>
        {#each filterTypes as type}
          <option value={type}>
            {getTypeDisplayName(type)} ({filters.filter((f) => f.type === type).length})
          </option>
        {/each}
      </select>
    </div>

    <Button on:click={loadFilters} disabled={isLoading} variant="secondary">Refresh</Button>
  </div>
</div>

<!-- DataGrid -->
<AvailableHeightContainer>
  <DataGrid
    data={filteredFilters}
    loading={isLoading}
    {columnLabels}
    emptyMessage="No filters found for the selected type."
    excludeColumns={["id"]}
    searchFields={["value", "type", "bucketName", "details"]}
  />
</AvailableHeightContainer>
