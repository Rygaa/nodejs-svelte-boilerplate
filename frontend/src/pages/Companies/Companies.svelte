<script lang="ts">
  import { trpc } from "@/config/trpc";
  import AvailableHeightContainer from "@/lib/components/AvailableHeightContainer.svelte";
  import DataGrid from "@/lib/components/DataGrid.svelte";
  import Icon from "@/lib/components/Icon.svelte";
  import PersonalizationModal from "./components/PersonalizationModal.svelte";
  import EmailModal from "./components/EmailModal.svelte";
  import { onMount } from "svelte";

  let isLoading = true;
  let error = "";
  let companies: any[] = [];
  let generatingEmails: Set<string> = new Set(); // Track which companies are generating emails
  let selectedCompany: any = null; // For viewing personalization details
  let showPersonalizationModal: boolean = false;
  let showEmailModal: boolean = false;
  let companyEmails: any[] = []; // Store company emails for the selected company
  let loadingEmails: boolean = false;
  let filterValues: Record<string, string[]> = {}; // Store filter values for DataGrid
  let loadingFilterValues = false;

  // Search and filter state
  let currentSearchTerm = "";
  let currentFilters: Record<string, string[]> = {};

  // Pagination state
  let currentPage = 1;
  let totalCount = 0;
  let itemsPerPage = 20; // Match backend default
  let totalPages = 0;

  async function loadCompanies(
    page: number = 1,
    searchTerm: string = currentSearchTerm,
    filters: Record<string, string[]> = currentFilters
  ) {
    try {
      isLoading = true;
      error = "";

      const offset = (page - 1) * itemsPerPage;
      const queryParams: any = {
        pagination: {
          limit: itemsPerPage,
          offset: offset,
        },
        filters: {},
      };

      // Add search term if provided
      if (searchTerm.trim()) {
        queryParams.search = searchTerm.trim();
      }

      // Add filters - pass them exactly as DataGrid provides them
      if (filters && Object.keys(filters).length > 0) {
        // Filter out empty arrays and pass non-empty filter arrays
        Object.entries(filters).forEach(([key, values]) => {
          if (values && values.length > 0) {
            queryParams.filters[key] = values;
          }
        });
      }

      const result = await trpc.company.list.query(queryParams);

      companies = result.companies;
      totalCount = result.meta.total;
      totalPages = Math.ceil(totalCount / itemsPerPage);
      currentPage = page;

      // Store current search state
      currentSearchTerm = searchTerm;
      currentFilters = filters;
    } catch (err: any) {
      error = err?.message || "Failed to load companies";

      // Add more specific error information
      if (err?.message?.includes("FORBIDDEN")) {
        error = "Access denied: You need ADMIN or ROOT privileges to view companies";
      }
    } finally {
      isLoading = false;
    }
  }

  async function loadFilterValues() {
    try {
      loadingFilterValues = true;

      // Don't specify columns - let the backend discover all available columns dynamically
      const result = await trpc.company.getFilterValues.query({});

      filterValues = result.filterValues;
    } catch (err: any) {
      // Don't show error as filtering will still work with local data
      filterValues = {};
    } finally {
      loadingFilterValues = false;
    }
  }

  // Column labels for DataGrid
  const columnLabels = {
    organization: "Company",
    domain: "Domain",
    location: "Location",
    industry: "Industry",
    headcount: "Headcount",
    emailCount: "Emails",
    emails_count: "Email Details",
    _count: "Count Info",
    createdAt: "Added",
    personalizationStatus: "Status",
  };

  async function viewDetails(company: any) {
    selectedCompany = company;
    showPersonalizationModal = true;

    // Load company emails
    await loadCompanyEmails(company.id);
  }

  async function loadCompanyEmails(companyId: string) {
    try {
      loadingEmails = true;
      const result = await trpc.companyEmail.list.query({
        companyId: companyId,
      });
      companyEmails = result.emails || [];
    } catch (err: any) {
      companyEmails = [];
    } finally {
      loadingEmails = false;
    }
  }

  function closePersonalizationModal() {
    showPersonalizationModal = false;
    selectedCompany = null;
    companyEmails = [];
  }

  function openEmailModal(company: any) {
    selectedCompany = company;
    showEmailModal = true;
  }

  function closeEmailModal() {
    showEmailModal = false;
    selectedCompany = null;
  }

  function onSearch(searchTerm: string, filters: Record<string, string[]>) {
    // Reset to first page when search/filters change
    loadCompanies(1, searchTerm, filters);
  }

  onMount(() => {
    loadCompanies(1);
    loadFilterValues();
  });
</script>

<div class="mb-6">
  <h1 class="text-2xl font-bold text-gray-900 mb-2">Companies</h1>
  <p class="text-gray-600">View and manage companies discovered through the Hunter.io API.</p>
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

<!-- Company List with Server-Side Pagination -->
<AvailableHeightContainer>
  <DataGrid
    data={companies}
    loading={isLoading}
    {columnLabels}
    storageKey="companies-table"
    excludeColumns={[
      "id",
      "state",
      "company_type",
      "year_founded",
      "personalization",
      "personalized_at",
      "updatedAt",
      "emails",
    ]}
    searchFields={["organization", "domain", "industry", "location"]}
    defaultSortField="createdAt"
    defaultSortDirection="desc"
    emptyMessage="No companies found. Run a discovery to start finding companies."
    searchPlaceholder="Search companies..."
    serverSidePagination={true}
    {totalCount}
    {currentPage}
    {itemsPerPage}
    onPageChange={(page) => loadCompanies(page, currentSearchTerm, currentFilters)}
    externalFilterValues={filterValues}
    {onSearch}
  >
    <svelte:fragment slot="actions" let:item>
      <Icon
        size="sm"
        iconname="more_1"
        tooltip="Generate AI-powered email for this company"
        on:click={(e) => {
          e.stopPropagation();
          viewDetails(item);
        }}
      />
      <Icon
        size="sm"
        iconname="email"
        tooltip="Generate AI-powered email for this company"
        on:click={(e) => {
          e.stopPropagation();
          openEmailModal(item);
        }}
      />
    </svelte:fragment>
  </DataGrid>
</AvailableHeightContainer>

<!-- Personalization Modal Component -->
<PersonalizationModal
  isOpen={showPersonalizationModal}
  {selectedCompany}
  {companyEmails}
  {loadingEmails}
  onClose={closePersonalizationModal}
/>

<!-- Email Generation Modal Component -->
<EmailModal isOpen={showEmailModal} {selectedCompany} onClose={closeEmailModal} />
