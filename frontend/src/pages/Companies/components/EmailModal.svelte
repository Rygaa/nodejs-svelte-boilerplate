<script lang="ts">
  import Button from "@/lib/components/Button.svelte";
  import Modal from "@/lib/components/Modal.svelte";
  import { trpc } from "../../../config/trpc";

  export let isOpen: boolean = false;
  export let selectedCompany: any = null;
  export let onClose: () => void;

  type ContextItem = {
    id: string;
    content: string;
    isDefault: boolean;
    userId: string;
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      email: string;
      username: string;
    } | null;
  };

  let selectedContext: ContextItem | null = null;
  let contexts: ContextItem[] = [];
  let isLoadingContexts = false;
  let isGeneratingEmail = false;
  let generationResult: any = null;
  let generationError: string = "";

  async function loadContexts() {
    try {
      isLoadingContexts = true;
      const result = await trpc.context.list.query({});
      contexts = result.contexts;
    } catch (err) {
      console.error("Failed to load contexts:", err);
    } finally {
      isLoadingContexts = false;
    }
  }

  async function generateEmail() {
    if (!selectedCompany || !selectedContext) {
      return;
    }

    try {
      isGeneratingEmail = true;
      generationError = "";
      generationResult = null;

      const result = await trpc.companyEmail.generate.mutate({
        companyId: selectedCompany.id,
        context: selectedContext.content,
      });

      generationResult = result;

      // Reset form
      selectedContext = null;

      // Optionally close modal after successful generation
      // onClose();
    } catch (err: any) {
      console.error("Failed to generate email:", err);
      generationError = err.message || "Failed to generate email";
    } finally {
      isGeneratingEmail = false;
    }
  }

  function selectContext(context: ContextItem) {
    selectedContext = context;
  }

  function handleClose() {
    // Reset state when closing
    selectedContext = null;
    generationResult = null;
    generationError = "";
    onClose();
  }

  // Load contexts when modal opens
  $: if (isOpen) {
    loadContexts();
  }
</script>

<!-- Email Generation Modal -->
<Modal
  {isOpen}
  title="Generate Email for {selectedCompany?.organization || selectedCompany?.domain || ''}"
  size="2xl"
  on:close={handleClose}
>
  <div slot="body">
    {#if selectedCompany}
      <!-- Company Summary -->
      <div class="mb-6 p-3 bg-gray-50 rounded-lg">
        <div class="text-sm text-gray-600">
          <strong>Domain:</strong>
          {selectedCompany.domain} •
          <strong>Industry:</strong>
          {selectedCompany.industry || "N/A"} •
          <strong>Location:</strong>
          {(() => {
            const parts = [];
            if (selectedCompany.city) parts.push(selectedCompany.city);
            if (selectedCompany.state) parts.push(selectedCompany.state);
            if (selectedCompany.country) parts.push(selectedCompany.country);
            return parts.length > 0 ? parts.join(", ") : "N/A";
          })()}
        </div>
      </div>

      <!-- Context Selection -->
      <div class="mb-6">
        <div class="block text-sm font-medium text-gray-700 mb-3">Select Context for Email Generation:</div>

        {#if isLoadingContexts}
          <div class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span class="ml-2 text-sm text-gray-500">Loading contexts...</span>
          </div>
        {:else if contexts.length === 0}
          <div class="text-center py-8 text-gray-500">
            <p class="text-sm">No contexts available</p>
            <p class="text-xs text-gray-400">Create contexts first to generate personalized emails</p>
          </div>
        {:else}
          <div class="space-y-2 max-h-60 overflow-y-auto">
            {#each contexts as context}
              <div
                class="flex items-start p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 {selectedContext?.id ===
                context.id
                  ? 'bg-blue-50 border-blue-200'
                  : 'border-gray-200'}"
                on:click={() => selectContext(context)}
                role="button"
                tabindex="0"
                on:keydown={(e) => e.key === "Enter" && selectContext(context)}
              >
                <input
                  type="radio"
                  name="context"
                  checked={selectedContext?.id === context.id}
                  class="mt-0.5 mr-3"
                  on:click|stopPropagation
                  on:change={() => selectContext(context)}
                />
                <div class="flex-1">
                  <div class="font-medium text-sm text-gray-900 truncate" title={context.content}>
                    {context.content.length > 80 ? context.content.substring(0, 80) + "..." : context.content}
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    Created: {new Date(context.createdAt).toLocaleDateString()}
                    {#if context.isDefault}• Default{/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>

          <div class="mt-3 text-xs text-gray-500">
            {selectedContext ? "1 context selected" : "Select a context to continue"}
          </div>
        {/if}
      </div>

      <!-- Generation Error -->
      {#if generationError}
        <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div class="text-sm text-red-800">
            <strong>Error:</strong>
            {generationError}
          </div>
        </div>
      {/if}

      <!-- Generation Result -->
      {#if generationResult}
        <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div class="text-sm text-green-800 mb-2">
            <strong>✓ Email generated successfully!</strong>
          </div>

          {#if generationResult.email?.subject}
            <div class="mb-2">
              <strong class="text-xs text-gray-600">Subject:</strong>
              <div class="text-sm font-medium">{generationResult.email.subject}</div>
            </div>
          {/if}

          {#if generationResult.email?.body}
            <div class="mb-2">
              <strong class="text-xs text-gray-600">Body:</strong>
              <div class="text-sm bg-white p-2 rounded border mt-1 whitespace-pre-wrap">
                {generationResult.email.body}
              </div>
            </div>
          {/if}

          {#if generationResult.email?.snippets && generationResult.email.snippets.length > 0}
            <div>
              <strong class="text-xs text-gray-600">Alternative snippets:</strong>
              <ul class="mt-1 text-xs text-gray-700 list-disc list-inside">
                {#each generationResult.email.snippets as snippet}
                  <li>{snippet}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </div>

  <div slot="footer" class="flex items-center justify-between">
    <div class="text-xs text-gray-500">
      {#if selectedContext}
        Ready to generate with selected context
      {:else}
        Select a context to generate email
      {/if}
    </div>

    <div class="flex items-center space-x-3">
      <Button variant="secondary" text="Cancel" on:click={handleClose} />
      <Button
        variant="primary"
        text="Generate Email"
        disabled={!selectedContext || isGeneratingEmail}
        loading={isGeneratingEmail}
        on:click={generateEmail}
      />
    </div>
  </div>
</Modal>
