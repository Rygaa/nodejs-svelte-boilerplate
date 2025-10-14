<script lang="ts">
  import { onMount } from "svelte";
  import { trpc } from "../config/trpc";

  let isLoading = true;
  let error = "";
  let stats = {
    lastHour: 0,
    last24Hours: 0,
    total: 0,
  };

  async function loadStats() {
    try {
      isLoading = true;
      error = "";

      const result = await trpc.company.getStats.query({});
      stats = result.stats;
    } catch (err: any) {
      error = err?.message || "Failed to load statistics";
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    loadStats();
  });

  function formatNumber(num: number): string {
    return new Intl.NumberFormat().format(num);
  }
</script>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-8">
    <h1 class="text-3xl font-bold text-gray-900">Company Statistics</h1>
    <button
      on:click={loadStats}
      disabled={isLoading}
      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? "Refreshing..." : "Refresh"}
    </button>
  </div>

  {#if error}
    <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Error</h3>
          <p class="mt-1 text-sm text-red-700">{error}</p>
        </div>
      </div>
    </div>
  {/if}

  {#if isLoading}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      {#each Array(3) as _}
        <div class="bg-white rounded-lg shadow-md border border-gray-200 p-6 animate-pulse">
          <div class="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
          <div class="h-8 bg-gray-300 rounded w-1/2 mb-2"></div>
          <div class="h-3 bg-gray-300 rounded w-full"></div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Last Hour Stats -->
      <div class="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Last Hour</h2>
          <div class="p-3 bg-green-100 rounded-full">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
          </div>
        </div>
        <div class="text-3xl font-bold text-gray-900 mb-2">
          {formatNumber(stats.lastHour)}
        </div>
        <p class="text-gray-600 text-sm">Companies added in the last 60 minutes</p>
      </div>

      <!-- Last 24 Hours Stats -->
      <div class="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Last 24 Hours</h2>
          <div class="p-3 bg-blue-100 rounded-full">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
          </div>
        </div>
        <div class="text-3xl font-bold text-gray-900 mb-2">
          {formatNumber(stats.last24Hours)}
        </div>
        <p class="text-gray-600 text-sm">Companies added in the last day</p>
      </div>

      <!-- Total Companies -->
      <div class="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Total Companies</h2>
          <div class="p-3 bg-purple-100 rounded-full">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              ></path>
            </svg>
          </div>
        </div>
        <div class="text-3xl font-bold text-gray-900 mb-2">
          {formatNumber(stats.total)}
        </div>
        <p class="text-gray-600 text-sm">Total companies in database</p>
      </div>
    </div>

    <!-- Additional Info Section -->
    <div class="mt-8 bg-gray-50 rounded-lg p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Statistics Overview</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
        <div>
          <p class="mb-2">
            <span class="font-medium">Recent Activity:</span>
            {stats.lastHour > 0 ? `${stats.lastHour} companies added recently` : "No recent activity"}
          </p>
          <p>
            <span class="font-medium">Daily Growth:</span>
            {stats.last24Hours > 0 ? `${stats.last24Hours} companies today` : "No companies added today"}
          </p>
        </div>
        <div>
          <p class="mb-2">
            <span class="font-medium">Hourly Rate:</span>
            {stats.lastHour > 0 ? `${stats.lastHour} companies/hour` : "0 companies/hour"}
          </p>
          <p>
            <span class="font-medium">Database Size:</span>
            {formatNumber(stats.total)} total entries
          </p>
        </div>
      </div>
    </div>
  {/if}
</div>
