<!-- DataTable.svelte (with scrollable body) -->
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import Modal from "./Modal.svelte";
  import Button from "./Button.svelte";

  // Component props with defaults
  type T = $$Generic<Record<string, any>>;

  export let data: T[] = [];
  export let loading: boolean = false;
  export let emptyMessage: string = "No data found.";
  export let itemsPerPage: number = 20;
  export let searchable: boolean = true;
  export const searchPlaceholder: string = "Search...";
  export let searchFields: (keyof T)[] | undefined = undefined;
  export let sortable: boolean = true;
  export let defaultSortField: keyof T | undefined = undefined;
  export let defaultSortDirection: "asc" | "desc" = "asc";
  export let showColumnToggle: boolean = true;
  export let excludeColumns: (keyof T)[] = ["id"] as (keyof T)[];
  export let columnLabels: Record<keyof T, string> = {} as Record<keyof T, string>;
  export let onRowClick: ((item: T) => void) | undefined = undefined;
  export let className: string = "";
  export let maxHeight: string | number | undefined = undefined;
  export let showDetailsModal: boolean = false;
  export let detailsModalTitle: string = "Item Details";
  export let onCloseDetails: (() => void) | undefined = undefined;
  export let selectedItem: T | null = null;
  export let visibleColumns: string[] | undefined = undefined;
  export let onVisibleColumnsChange: ((columns: string[]) => void) | undefined = undefined;
  export let storageKey: string = ""; // LocalStorage key for persisting column visibility

  // Server-side pagination props
  export let serverSidePagination: boolean = false;
  export let totalCount: number = 0;
  export let currentPage: number = 1;
  export let onPageChange: ((page: number) => void) | undefined = undefined;

  // Server-side filtering props
  export let onSearch: ((searchTerm: string, filters: Record<string, string[]>) => void) | undefined =
    undefined;

  // External filter values for server-side filtering
  export let externalFilterValues: Record<string, string[]> | undefined = undefined;

  // State variables
  let searchTerm = "";
  let columnSearchTerms: Record<string, string[]> = {};
  let dropdownSearchTerms: Record<string, string> = {}; // For filtering dropdown options only
  let openDropdowns: Record<string, boolean> = {};
  let sortField: keyof T | undefined = defaultSortField;
  let sortDirection: "asc" | "desc" = defaultSortDirection;
  let internalCurrentPage = 1; // For client-side pagination only
  let visibleColumnsState: Record<string, boolean> = {};
  let showColumnModal = false;
  let isInitializing = true;

  // JSON modal state
  let showJsonModal = false;
  let jsonModalData: any = null;
  let jsonModalTitle = "";

  // Debounced search
  let searchTimeout: ReturnType<typeof setTimeout>;

  // LocalStorage functions
  function saveVisibleColumnsToStorage(columns: string[]) {
    if (storageKey && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(`datagrid_columns_${storageKey}`, JSON.stringify(columns));
      } catch (e) {
        console.warn("Failed to save visible columns to localStorage:", e);
      }
    }
  }

  function loadVisibleColumnsFromStorage(): string[] | null {
    if (storageKey && typeof localStorage !== "undefined") {
      try {
        const saved = localStorage.getItem(`datagrid_columns_${storageKey}`);
        return saved ? JSON.parse(saved) : null;
      } catch (e) {
        console.warn("Failed to load visible columns from localStorage:", e);
        return null;
      }
    }
    return null;
  }

  // Computed: available columns
  $: availableColumns =
    data.length > 0 ? Object.keys(data[0]).filter((key) => !excludeColumns.includes(key as keyof T)) : [];

  // Initialize visible columns
  $: if (availableColumns.length > 0 && isInitializing) {
    // Priority: localStorage > visibleColumns prop > all columns visible
    const savedColumns = loadVisibleColumnsFromStorage();
    let columnsToShow: string[] = [];

    if (savedColumns && savedColumns.length > 0) {
      // Use saved columns, but filter to only include available columns
      columnsToShow = savedColumns.filter((col) => availableColumns.includes(col));
    } else if (visibleColumns && visibleColumns.length > 0) {
      columnsToShow = visibleColumns;
    } else {
      columnsToShow = availableColumns;
    }

    visibleColumnsState = availableColumns.reduce(
      (acc, key) => {
        acc[key] = columnsToShow.includes(key);
        return acc;
      },
      {} as Record<string, boolean>
    );

    isInitializing = false;
  }

  // Computed: sorted data
  $: sortedData = (() => {
    if (!sortField || !sortable) return data;

    return [...data].sort((a, b) => {
      const aVal = sortField ? (a[sortField] ?? "") : "";
      const bVal = sortField ? (b[sortField] ?? "") : "";

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  })();

  // Computed: filtered data
  $: filteredData = (() => {
    // For server-side pagination, don't filter locally - data is already filtered by server
    if (serverSidePagination && onSearch) {
      return sortedData;
    }

    // Client-side filtering for non-server-side pagination
    let filtered = sortedData;

    // Apply global search
    if (searchTerm && searchable) {
      const fieldsToSearch =
        searchFields || (availableColumns.filter((key) => visibleColumnsState[key] !== false) as (keyof T)[]);

      filtered = filtered.filter((item) =>
        fieldsToSearch.some((field) => {
          const value = item[field];
          if (value == null) return false;
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply column-specific searches
    const activeColumnSearches = Object.entries(columnSearchTerms).filter(([_, terms]) => terms.length > 0);
    if (activeColumnSearches.length > 0) {
      filtered = filtered.filter((item) =>
        activeColumnSearches.every(([column, terms]) => {
          const value = item[column as keyof T];
          if (value == null) return false;
          const stringValue = String(value).toLowerCase();
          return terms.some((term) => stringValue.includes(term.toLowerCase()));
        })
      );
    }

    return filtered;
  })();

  // Pagination calculations
  $: effectiveCurrentPage = serverSidePagination ? currentPage : internalCurrentPage;
  $: effectiveTotalCount = serverSidePagination ? totalCount : filteredData.length;
  $: totalPages = Math.ceil(effectiveTotalCount / itemsPerPage);

  // For client-side pagination, slice the data. For server-side, use all data as-is
  $: currentItems = serverSidePagination
    ? filteredData
    : (() => {
        const indexOfLastItem = internalCurrentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return filteredData.slice(indexOfFirstItem, indexOfLastItem);
      })();

  // Computed: visible columns list
  $: visibleColumnsList = availableColumns.filter((key) => visibleColumnsState[key]);

  // Computed: has active filters
  $: hasActiveFilters =
    searchTerm.trim() !== "" ||
    Object.keys(columnSearchTerms).some((key) => columnSearchTerms[key].length > 0);

  // Helper functions
  function formatColumnLabel(key: string): string {
    if (columnLabels[key as keyof T]) {
      return columnLabels[key as keyof T] as string;
    }
    return key
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .trim();
  }

  function defaultFormatCell(key: keyof T, value: any): string {
    if (value == null) return "—";

    if (key === "createdAt" || key === "updatedAt" || String(key).includes("Date")) {
      return value ? new Date(value).toLocaleDateString() : "—";
    }

    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(", ") : "—";
    }

    return String(value);
  }

  function handleSort(field: keyof T) {
    if (!sortable) return;

    if (sortField === field) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortField = field;
      sortDirection = "asc";
    }
  }

  function handlePageChange(page: number) {
    if (serverSidePagination && onPageChange) {
      onPageChange(page);
    } else {
      internalCurrentPage = page;
    }
  }

  function handleColumnSearch(columnKey: string, value: string) {
    const currentTerms = columnSearchTerms[columnKey] || [];
    if (!currentTerms.includes(value)) {
      columnSearchTerms = {
        ...columnSearchTerms,
        [columnKey]: [...currentTerms, value],
      };
      if (!serverSidePagination) {
        internalCurrentPage = 1;
      } else if (onSearch) {
        triggerServerSearch();
      }
    }
  }

  function clearColumnSearch(columnKey: string, valueToRemove?: string) {
    if (valueToRemove) {
      // Remove specific value from array
      const currentTerms = columnSearchTerms[columnKey] || [];
      const updatedTerms = currentTerms.filter((term) => term !== valueToRemove);
      if (updatedTerms.length > 0) {
        columnSearchTerms = {
          ...columnSearchTerms,
          [columnKey]: updatedTerms,
        };
      } else {
        const updated = { ...columnSearchTerms };
        delete updated[columnKey];
        columnSearchTerms = updated;
      }
    } else {
      // Clear all values for this column
      const updated = { ...columnSearchTerms };
      delete updated[columnKey];
      columnSearchTerms = updated;
    }
    if (serverSidePagination && onSearch) {
      triggerServerSearch();
    }
  }

  function clearAllFilters() {
    searchTerm = "";
    columnSearchTerms = {};
    if (!serverSidePagination) {
      internalCurrentPage = 1;
    } else if (onSearch) {
      // Trigger server-side search with empty filters
      onSearch("", {});
    }
  }

  // Debounced server-side search
  function triggerServerSearch() {
    if (serverSidePagination && onSearch) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        onSearch(searchTerm, columnSearchTerms);
      }, 300); // 300ms debounce
    }
  }

  // Handle search input changes
  function handleSearchInput(value: string) {
    searchTerm = value;
    if (serverSidePagination && onSearch) {
      triggerServerSearch();
    } else if (!serverSidePagination) {
      internalCurrentPage = 1;
    }
  }

  function toggleDropdown(columnKey: string) {
    openDropdowns = {
      ...openDropdowns,
      [columnKey]: !openDropdowns[columnKey],
    };
    // Clear dropdown search when opening
    if (openDropdowns[columnKey]) {
      dropdownSearchTerms = {
        ...dropdownSearchTerms,
        [columnKey]: "",
      };
    }
  }

  function closeDropdown(columnKey: string) {
    openDropdowns = {
      ...openDropdowns,
      [columnKey]: false,
    };
    // Clear dropdown search when closing
    const updated = { ...dropdownSearchTerms };
    delete updated[columnKey];
    dropdownSearchTerms = updated;
  }

  function closeAllDropdowns() {
    openDropdowns = {};
    dropdownSearchTerms = {}; // Clear all dropdown searches
  }

  function handleDropdownSearch(columnKey: string, value: string) {
    dropdownSearchTerms = {
      ...dropdownSearchTerms,
      [columnKey]: value,
    };
  }

  // JSON modal functions
  function openJsonModal(data: any, title: string) {
    jsonModalData = data;
    jsonModalTitle = title;
    showJsonModal = true;
  }

  function closeJsonModal() {
    showJsonModal = false;
    jsonModalData = null;
    jsonModalTitle = "";
  }

  // Check if a value is an object (but not null, array, or date)
  function isDisplayableObject(value: any): boolean {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      Object.keys(value).length > 0
    );
  }

  function getColumnValues(columnKey: string): string[] {
    // Use external filter values if available (for server-side filtering)
    if (externalFilterValues && externalFilterValues[columnKey]) {
      return externalFilterValues[columnKey];
    }

    // Fall back to local data filtering for client-side or when external values not available
    const values = data
      .map((item) => item[columnKey as keyof T])
      .filter((value) => value != null && value !== "")
      .map((value) => String(value));
    const localValues = [...new Set(values)].sort();
    return localValues;
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest(".column-search-dropdown")) {
      closeAllDropdowns();
    }
  }

  function updateVisibleColumns(key: string, checked: boolean) {
    visibleColumnsState = {
      ...visibleColumnsState,
      [key]: checked,
    };

    if (!isInitializing) {
      const visible = availableColumns.filter((col) => visibleColumnsState[col]);

      // Save to localStorage
      saveVisibleColumnsToStorage(visible);

      // Call the callback if provided
      if (onVisibleColumnsChange) {
        onVisibleColumnsChange(visible);
      }
    }
  }

  function showAllColumns() {
    visibleColumnsState = availableColumns.reduce(
      (acc, key) => {
        acc[key] = true;
        return acc;
      },
      {} as Record<string, boolean>
    );

    // Save to localStorage
    saveVisibleColumnsToStorage(availableColumns);

    // Call the callback if provided
    if (onVisibleColumnsChange) {
      onVisibleColumnsChange(availableColumns);
    }
  }

  function hideAllColumns() {
    const firstKey = availableColumns[0];
    visibleColumnsState = availableColumns.reduce(
      (acc, key) => {
        acc[key] = key === firstKey;
        return acc;
      },
      {} as Record<string, boolean>
    );

    // Save to localStorage
    const visible = [firstKey];
    saveVisibleColumnsToStorage(visible);

    // Call the callback if provided
    if (onVisibleColumnsChange) {
      onVisibleColumnsChange(visible);
    }
  }

  // Lifecycle
  onMount(() => {
    document.addEventListener("mousedown", handleClickOutside);
  });

  onDestroy(() => {
    document.removeEventListener("mousedown", handleClickOutside);
    // Clear search timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
  });

  // Style calculations - Responsive height handling
  $: containerStyle = maxHeight
    ? `height: ${typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight};`
    : "";
</script>

{#if loading}
  <div class="flex items-center justify-center h-64 {className}">
    <div class="text-lg text-gray-600">Loading...</div>
  </div>
{:else}
  <!-- Data Table Container - Responsive Height -->
  <div class="bg-white rounded-lg shadow flex flex-col h-full {className}" style={containerStyle}>
    <!-- Fixed Header with Controls -->
    <div class="flex-shrink-0 p-4 border-b border-gray-200">
      <div class="flex items-center justify-between space-x-4">
        <!-- Controls -->
        <div class="flex items-center space-x-2">
          {#if showColumnToggle}
            <Button variant="outline" size="sm" on:click={() => (showColumnModal = true)}>
              <svg slot="iconLeft" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width={2}
                  d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
                />
              </svg>
              Columns
            </Button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Scrollable Table Area -->
    <div class="flex-1 min-h-0 overflow-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <!-- Sticky Table Header -->
        <thead class="bg-gray-50 sticky top-0 z-10">
          <tr>
            {#if $$slots.actions}
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50"
              >
                Actions
              </th>
            {/if}
            {#each visibleColumnsList as key}
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative bg-gray-50"
              >
                <div class="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={!sortable}
                    on:click={() => sortable && handleSort(key)}
                  >
                    <span>{formatColumnLabel(key)}</span>
                    {#if sortable}
                      <span class={sortField === key ? "text-blue-600" : "text-gray-400"}>
                        {#if sortField === key}
                          {sortDirection === "asc" ? "↑" : "↓"}
                        {:else}
                          ↕️
                        {/if}
                      </span>
                    {/if}
                  </Button>

                  <!-- Column Search Dropdown -->
                  <div class="relative column-search-dropdown">
                    <Button
                      variant="ghost"
                      iconOnly={true}
                      size="xs"
                      on:click={(e) => {
                        e.stopPropagation();
                        toggleDropdown(key);
                      }}
                      tooltip="Filter {formatColumnLabel(key)} {columnSearchTerms[key] &&
                      columnSearchTerms[key].length > 0
                        ? `(${columnSearchTerms[key].length} selected)`
                        : ''}"
                    >
                      <svg
                        slot="iconLeft"
                        class="w-4 h-4 {columnSearchTerms[key] && columnSearchTerms[key].length > 0
                          ? 'text-blue-600'
                          : 'text-gray-400'}"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width={2}
                          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z"
                        />
                      </svg>
                    </Button>

                    <!-- Dropdown Content -->
                    {#if openDropdowns[key]}
                      <div
                        class="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 min-w-[200px] max-h-64 overflow-y-auto"
                      >
                        <div class="p-2 border-b">
                          <input
                            type="text"
                            placeholder="Search {formatColumnLabel(key)}..."
                            value={dropdownSearchTerms[key] || ""}
                            on:input={(e) => handleDropdownSearch(key, e.currentTarget.value)}
                            class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <!-- Selected Values -->
                        {#if columnSearchTerms[key] && columnSearchTerms[key].length > 0}
                          <div class="border-b bg-blue-50 p-2">
                            <div class="text-xs text-blue-700 font-medium mb-1">
                              Selected ({columnSearchTerms[key].length}):
                            </div>
                            <div class="flex flex-wrap gap-1">
                              {#each columnSearchTerms[key] as selectedValue}
                                <span
                                  class="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
                                >
                                  {selectedValue}
                                  <Button
                                    variant="ghost"
                                    iconOnly={true}
                                    size="xs"
                                    on:click={() => clearColumnSearch(key, selectedValue)}
                                  >
                                    ×
                                  </Button>
                                </span>
                              {/each}
                            </div>
                          </div>
                        {/if}

                        <div class="max-h-48 overflow-y-auto">
                          {#each getColumnValues(key).filter((value) => !dropdownSearchTerms[key] || value
                                .toLowerCase()
                                .includes(dropdownSearchTerms[key].toLowerCase())) as value}
                            {@const isSelected =
                              columnSearchTerms[key] && columnSearchTerms[key].includes(value)}
                            <Button
                              variant="ghost"
                              size="xs"
                              fullWidth={true}
                              on:click={() => {
                                if (isSelected) {
                                  clearColumnSearch(key, value);
                                } else {
                                  handleColumnSearch(key, value);
                                }
                              }}
                            >
                              <span class="mr-2">{isSelected ? "✓" : ""}</span>
                              {value}
                            </Button>
                          {/each}
                          {#if getColumnValues(key).filter((value) => !dropdownSearchTerms[key] || value
                                .toLowerCase()
                                .includes(dropdownSearchTerms[key].toLowerCase())).length === 0}
                            <div class="px-3 py-2 text-xs text-gray-500">No values found</div>
                          {/if}
                        </div>

                        {#if columnSearchTerms[key] && columnSearchTerms[key].length > 0}
                          <div class="border-t p-2">
                            <Button
                              variant="danger"
                              size="xs"
                              fullWidth={true}
                              text="Clear All Filters"
                              on:click={() => {
                                clearColumnSearch(key);
                                closeDropdown(key);
                              }}
                            />
                          </div>
                        {/if}
                      </div>
                    {/if}
                  </div>
                </div>
              </th>
            {/each}
          </tr>
        </thead>

        <!-- Scrollable Table Body -->
        <tbody class="bg-white divide-y divide-gray-200">
          {#if currentItems.length === 0}
            <tr>
              <td
                colspan={visibleColumnsList.length + ($$slots.actions ? 1 : 0)}
                class="px-6 py-12 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          {:else}
            {#each currentItems as item, index (item.id || index)}
              <tr
                class="hover:bg-gray-50 {onRowClick ? 'cursor-pointer' : ''}"
                on:click={() => onRowClick?.(item)}
              >
                {#if $$slots.actions}
                  <td class="px-4 py-2">
                    <div class="flex space-x-4">
                      <!-- Custom actions slot - pass the current item -->
                      <slot name="actions" {item} />
                    </div>
                  </td>
                {/if}
                {#each visibleColumnsList as key}
                  <td
                    class="px-4 py-2 text-sm text-gray-900 max-w-xs truncate whitespace-nowrap overflow-hidden"
                  >
                    {#if isDisplayableObject(item[key])}
                      <Button
                        variant="primary"
                        size="xs"
                        text="View More"
                        tooltip="View object details"
                        on:click={(e) => {
                          e.stopPropagation();
                          openJsonModal(
                            item[key],
                            `${formatColumnLabel(String(key))} - ${item.id || "Item"}`
                          );
                        }}
                      />
                    {:else}
                      <span class="block truncate" title={defaultFormatCell(key, item[key])}>
                        {defaultFormatCell(key, item[key])}
                      </span>
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    <!-- Fixed Pagination Footer -->
    {#if totalPages > 1}
      <div class="flex-shrink-0 bg-white px-4 py-3 border-t border-gray-200">
        <div class="flex justify-between sm:hidden">
          <Button
            variant="outline"
            text="Previous"
            disabled={effectiveCurrentPage === 1}
            on:click={() => handlePageChange(Math.max(1, effectiveCurrentPage - 1))}
          />
          <Button
            variant="outline"
            text="Next"
            disabled={effectiveCurrentPage === totalPages}
            on:click={() => handlePageChange(Math.min(totalPages, effectiveCurrentPage + 1))}
          />
        </div>
        <div class="hidden sm:flex sm:items-center sm:justify-between">
          <p class="text-sm text-gray-700">
            Showing <span class="font-medium">{(effectiveCurrentPage - 1) * itemsPerPage + 1}</span> to
            <span class="font-medium"
              >{Math.min(effectiveCurrentPage * itemsPerPage, effectiveTotalCount)}</span
            >
            of
            <span class="font-medium">{effectiveTotalCount}</span> results
          </p>
          <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            <Button
              variant="outline"
              text="Previous"
              size="sm"
              disabled={effectiveCurrentPage === 1}
              on:click={() => handlePageChange(Math.max(1, effectiveCurrentPage - 1))}
              rounded="none"
            />
            {#each Array(Math.min(5, totalPages)) as _, i}
              {@const pageNum = i + 1}
              <Button
                variant={effectiveCurrentPage === pageNum ? "primary" : "outline"}
                text={String(pageNum)}
                size="sm"
                rounded="none"
                on:click={() => handlePageChange(pageNum)}
              />
            {/each}
            <Button
              variant="outline"
              text="Next"
              size="sm"
              disabled={effectiveCurrentPage === totalPages}
              on:click={() => handlePageChange(Math.min(totalPages, effectiveCurrentPage + 1))}
              rounded="none"
            />
          </nav>
        </div>
      </div>
    {/if}
  </div>

  <!-- Column Visibility Modal -->
  {#if showColumnModal}
    <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
        <!-- Modal Header -->
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900">Show/Hide Columns</h3>
          <Button
            variant="ghost"
            iconOnly={true}
            size="sm"
            on:click={() => (showColumnModal = false)}
            tooltip="Close modal"
          >
            ✕
          </Button>
        </div>

        <!-- Modal Content -->
        <div class="mb-6">
          <p class="text-sm text-gray-600 mb-4">Select which columns you want to display in the table:</p>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
            {#each availableColumns as key}
              <label class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={visibleColumnsState[key] || false}
                  on:change={(e) => updateVisibleColumns(key, e.currentTarget.checked)}
                  class="rounded text-blue-600 focus:ring-blue-500"
                />
                <span class="text-sm text-gray-700">{formatColumnLabel(key)}</span>
              </label>
            {/each}
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="flex justify-end space-x-3">
          <Button variant="secondary" text="Show All" on:click={showAllColumns} />
          <Button variant="secondary" text="Hide All" on:click={hideAllColumns} />
          <Button variant="primary" text="Done" on:click={() => (showColumnModal = false)} />
        </div>
      </div>
    </div>
  {/if}

  <!-- Details Modal -->
  {#if showDetailsModal && selectedItem}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">{detailsModalTitle || "Details"}</h2>
          <Button variant="ghost" iconOnly={true} size="sm" on:click={onCloseDetails} tooltip="Close details">
            ✕
          </Button>
        </div>
        <div class="space-y-3">
          {#each availableColumns as columnKey}
            <div class="border-b pb-2">
              <dt class="text-sm font-medium text-gray-500">{formatColumnLabel(columnKey)}</dt>
              <dd class="mt-1 text-sm text-gray-900">
                {defaultFormatCell(columnKey, selectedItem[columnKey])}
              </dd>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- JSON Modal -->
  <Modal isOpen={showJsonModal} title={jsonModalTitle} size="2xl" on:close={closeJsonModal}>
    <div slot="body">
      {#if jsonModalData}
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="text-sm font-medium text-gray-900 mb-3">JSON Data:</h4>
          <pre
            class="bg-gray-900 text-green-400 p-4 rounded-md overflow-auto max-h-96 text-sm font-mono whitespace-pre-wrap">{JSON.stringify(
              jsonModalData,
              null,
              2
            )}</pre>
        </div>
      {/if}
    </div>

    <div slot="footer" class="flex items-center justify-end space-x-3">
      <Button variant="secondary" text="Close" on:click={closeJsonModal} />
    </div>
  </Modal>
{/if}
