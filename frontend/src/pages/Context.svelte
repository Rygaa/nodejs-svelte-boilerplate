<script lang="ts">
  import { onMount } from "svelte";
  import { trpc } from "../config/trpc";
  import Button from "../lib/components/Button.svelte";
  import Input from "../lib/components/Input.svelte";
  import Modal from "../lib/components/Modal.svelte";
  import DataGrid from "../lib/components/DataGrid.svelte";

  let contexts: any[] = [];
  let loading = true;
  let error = "";
  let showCreateModal = false;
  let showEditModal = false;
  let editingContext: any = null;

  // Form data
  let contextForm = {
    content: "",
    isDefault: false,
  };

  const columnLabels = {
    content: "Content",
    isDefault: "Default",
    createdAt: "Created",
    updatedAt: "Updated",
  };

  onMount(() => {
    loadContexts();
  });

  async function loadContexts() {
    try {
      loading = true;
      error = "";
      const result = await trpc.context.list.query({ limit: 50, offset: 0 });
      contexts = result.contexts || [];
    } catch (err: any) {
      error = err.message || "Failed to load contexts";
      contexts = [];
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    contextForm = { content: "", isDefault: false };
    showCreateModal = true;
  }

  function openEditModal(context: any) {
    editingContext = context;
    contextForm = {
      content: context.content,
      isDefault: context.isDefault,
    };
    showEditModal = true;
  }

  function closeModals() {
    showCreateModal = false;
    showEditModal = false;
    editingContext = null;
    contextForm = { content: "", isDefault: false };
  }

  async function createContext() {
    try {
      if (!contextForm.content.trim()) {
        alert("Please fill in the content field");
        return;
      }

      await trpc.context.create.mutate({
        content: contextForm.content.trim(),
        isDefault: contextForm.isDefault,
      });

      closeModals();
      await loadContexts();
    } catch (err: any) {
      alert(err.message || "Failed to create context");
    }
  }

  async function updateContext() {
    try {
      if (!contextForm.content.trim()) {
        alert("Please fill in the content field");
        return;
      }

      await trpc.context.update.mutate({
        id: editingContext.id,
        content: contextForm.content.trim(),
        isDefault: contextForm.isDefault,
      });

      closeModals();
      await loadContexts();
    } catch (err: any) {
      alert(err.message || "Failed to update context");
    }
  }

  async function deleteContext(context: any) {
    if (!confirm(`Are you sure you want to delete this context?`)) {
      return;
    }

    try {
      await trpc.context.delete.mutate({ id: context.id });
      await loadContexts();
    } catch (err: any) {
      alert(err.message || "Failed to delete context");
    }
  }
</script>

<div class="p-6">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Email Contexts</h1>
    <Button on:click={openCreateModal} variant="primary">Create Context</Button>
  </div>

  {#if error}
    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
      {error}
    </div>
  {/if}

  <DataGrid data={contexts} {columnLabels} {loading}>
    <svelte:fragment slot="actions" let:item>
      <Button
        variant="primary"
        size="xs"
        text="Edit"
        on:click={(e) => {
          e.stopPropagation();
          openEditModal(item);
        }}
      />
      <Button
        variant="danger"
        size="xs"
        text="Delete"
        on:click={(e) => {
          e.stopPropagation();
          deleteContext(item);
        }}
      />
    </svelte:fragment>
  </DataGrid>
</div>

<!-- Create Context Modal -->
<Modal isOpen={showCreateModal} title="Create New Context" on:close={closeModals}>
  <div class="space-y-4">
    <div>
      <label for="content" class="block text-sm font-medium text-gray-700 mb-2"> Content </label>
      <textarea
        id="content"
        bind:value={contextForm.content}
        rows="6"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        placeholder="Enter context content..."
        required
      ></textarea>
    </div>
    <div class="flex items-center">
      <input
        id="isDefault"
        type="checkbox"
        bind:checked={contextForm.isDefault}
        class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
      />
      <label for="isDefault" class="ml-2 block text-sm text-gray-700"> Set as default context </label>
    </div>
  </div>

  <div slot="footer" class="flex justify-end space-x-3">
    <Button on:click={closeModals} variant="secondary">Cancel</Button>
    <Button on:click={createContext} variant="primary">Create</Button>
  </div>
</Modal>

<!-- Edit Context Modal -->
<Modal isOpen={showEditModal} title="Edit Context" on:close={closeModals}>
  <div class="space-y-4">
    <div>
      <label for="edit-content" class="block text-sm font-medium text-gray-700 mb-2"> Content </label>
      <textarea
        id="edit-content"
        bind:value={contextForm.content}
        rows="6"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        placeholder="Enter context content..."
        required
      ></textarea>
    </div>
    <div class="flex items-center">
      <input
        id="editIsDefault"
        type="checkbox"
        bind:checked={contextForm.isDefault}
        class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
      />
      <label for="editIsDefault" class="ml-2 block text-sm text-gray-700"> Set as default context </label>
    </div>
  </div>

  <div slot="footer" class="flex justify-end space-x-3">
    <Button on:click={closeModals} variant="secondary">Cancel</Button>
    <Button on:click={updateContext} variant="primary">Update</Button>
  </div>
</Modal>
