<script lang="ts">
  import Button from "@/lib/components/Button.svelte";
  import Modal from "@/lib/components/Modal.svelte";

  export let isOpen: boolean = false;
  export let selectedCompany: any = null;
  export let companyEmails: any[] = [];
  export let loadingEmails: boolean = false;
  export let onClose: () => void;
</script>

<!-- Company Details Modal -->
<Modal
  {isOpen}
  title="Company Details: {selectedCompany?.organization || selectedCompany?.domain || ''}"
  size="4xl"
  on:close={onClose}
>
  <div slot="body">
    {#if selectedCompany}
      <div class="mb-4 p-3 bg-gray-50 rounded-lg">
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Domain:</strong> {selectedCompany.domain}</div>
          <div><strong>Industry:</strong> {selectedCompany.industry || "N/A"}</div>
          <div>
            <strong>Location:</strong>
            {(() => {
              const parts = [];
              if (selectedCompany.city) parts.push(selectedCompany.city);
              if (selectedCompany.state) parts.push(selectedCompany.state);
              if (selectedCompany.country) parts.push(selectedCompany.country);
              return parts.length > 0 ? parts.join(", ") : "N/A";
            })()}
          </div>
          <div>
            <strong>Personalized:</strong>
            {selectedCompany.personalized_at
              ? new Date(selectedCompany.personalized_at).toLocaleDateString()
              : "N/A"}
          </div>
        </div>
      </div>

      <div class="max-h-96 overflow-y-auto space-y-6">
        <!-- AI-Generated Company Insights Section -->
        <div>
          <h4 class="font-medium text-gray-900 mb-3">AI-Generated Company Insights:</h4>
          <div class="prose prose-sm max-w-none">
            {#if selectedCompany.personalization}
              {@const personalizationText =
                typeof selectedCompany.personalization === "string"
                  ? selectedCompany.personalization
                  : JSON.parse(selectedCompany.personalization)}
              <p class="text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                {personalizationText}
              </p>
            {:else}
              <p class="text-gray-500 italic">No personalization data available.</p>
            {/if}
          </div>
        </div>

        <!-- Generated Emails Section -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-medium text-gray-900">Generated Emails ({companyEmails.length})</h4>
            {#if loadingEmails}
              <span class="text-sm text-gray-500">Loading...</span>
            {/if}
          </div>

          {#if companyEmails.length > 0}
            <div class="space-y-4">
              {#each companyEmails as email, index}
                <div class="border border-gray-200 rounded-lg p-4 bg-white">
                  <div class="flex items-start justify-between mb-2">
                    <h5 class="text-sm font-semibold text-gray-800">
                      {email.subject || `Email #${index + 1}`}
                    </h5>
                    <span class="text-xs text-gray-500">
                      {new Date(email.createdAt).toLocaleDateString()} at {new Date(
                        email.createdAt
                      ).toLocaleTimeString()}
                    </span>
                  </div>

                  {#if email.body}
                    <div
                      class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-3 bg-gray-50 p-3 rounded border"
                    >
                      {email.body}
                    </div>
                  {/if}

                  {#if email.snippets && email.snippets.length > 0}
                    <div class="mb-2">
                      <span class="text-xs font-medium text-gray-600">Alternative snippets:</span>
                      <ul class="mt-1 text-xs text-gray-600 list-disc list-inside">
                        {#each email.snippets as snippet}
                          <li>{snippet}</li>
                        {/each}
                      </ul>
                    </div>
                  {/if}

                  {#if email.notes}
                    <div class="text-xs text-gray-600">
                      <span class="font-medium">Notes:</span>
                      {email.notes}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {:else if !loadingEmails}
            <div class="text-center py-8 text-gray-500">
              <svg
                class="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <p class="mt-2 text-sm">No emails generated yet</p>
              <p class="text-xs text-gray-400">Use the "Generate Email" action to create AI-powered emails</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <div slot="footer" class="flex items-center justify-end space-x-3">
    <Button variant="secondary" text="Close" on:click={onClose} />
  </div>
</Modal>
