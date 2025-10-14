<!-- Example usage of DataGrid with custom Svelte component actions -->
<script lang="ts">
  import DataGrid from "../lib/components/DataGrid.svelte";
  import Button from "../lib/components/Button.svelte";

  // Sample data
  let sampleData = [
    { id: 1, name: "John Doe", email: "john@example.com", role: "Admin" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", role: "User" },
    { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "Manager" },
  ];

  // Action handlers
  function handleEdit(item: any) {
    console.log("Edit item:", item);
    alert(`Editing ${item.name}`);
  }

  function handleDelete(item: any) {
    console.log("Delete item:", item);
    if (confirm(`Delete ${item.name}?`)) {
      sampleData = sampleData.filter((d) => d.id !== item.id);
    }
  }

  function handleView(item: any) {
    console.log("View item:", item);
    alert(`Viewing details for ${item.name}`);
  }

  function handlePromote(item: any) {
    console.log("Promote item:", item);
    alert(`Promoting ${item.name}`);
  }
</script>

<div class="p-6">
  <h1 class="text-2xl font-bold mb-6">DataGrid with Custom Actions Example</h1>

  <!-- DataGrid with Custom Svelte Component Actions -->
  <DataGrid data={sampleData} className="mb-8">
    <!-- Custom actions slot - receives {item} as prop -->
    <svelte:fragment slot="actions" let:item>
      <!-- Edit Button -->
      <Button
        variant="primary"
        size="xs"
        icon="edit"
        text="Edit"
        on:click={(e) => {
          e.stopPropagation();
          handleEdit(item);
        }}
      />

      <!-- View Button -->
      <Button
        variant="secondary"
        size="xs"
        icon="eye"
        text="View"
        on:click={(e) => {
          e.stopPropagation();
          handleView(item);
        }}
      />

      <!-- Role-specific actions -->
      {#if item.role !== "Admin"}
        <Button
          variant="success"
          size="xs"
          icon="arrow-up"
          text="Promote"
          on:click={(e) => {
            e.stopPropagation();
            handlePromote(item);
          }}
        />
      {/if}

      <!-- Delete Button -->
      <Button
        variant="danger"
        size="xs"
        icon="trash"
        text="Delete"
        on:click={(e) => {
          e.stopPropagation();
          handleDelete(item);
        }}
      />

      <!-- Icon-only actions -->
      <Button
        variant="ghost"
        size="xs"
        icon="download"
        iconOnly={true}
        tooltip="Download data for {item.name}"
        on:click={(e) => {
          e.stopPropagation();
          console.log("Download:", item);
        }}
      />

      <!-- Conditional actions based on item properties -->
      {#if item.email}
        <Button
          variant="outline"
          size="xs"
          icon="mail"
          iconOnly={true}
          tooltip="Send email to {item.email}"
          on:click={(e) => {
            e.stopPropagation();
            window.location.href = `mailto:${item.email}`;
          }}
        />
      {/if}
    </svelte:fragment>
  </DataGrid>

  <!-- Example without actions -->
  <h2 class="text-xl font-semibold mb-4 mt-8">DataGrid without Actions</h2>
  <DataGrid data={sampleData} className="mb-4" />
</div>

<style>
  /* Any custom styles for this page */
</style>
