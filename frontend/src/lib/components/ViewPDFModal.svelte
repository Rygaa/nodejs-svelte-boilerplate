<script lang="ts">
  import Modal from "./Modal.svelte";

  let {
    isOpen = $bindable(false),
    fileName = "",
    base64 = "",
    filePath = "",
    onclose,
  }: {
    isOpen?: boolean;
    fileName?: string;
    base64?: string;
    filePath?: string;
    onclose?: () => void;
  } = $props();

  // Convert base64 to blob URL for PDF display
  const pdfUrl = $derived(() => {
    if (!base64) return "";

    // Remove data URL prefix if present
    const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/pdf" });
    return URL.createObjectURL(blob);
  });

  // Clean up blob URL when component is destroyed
  $effect(() => {
    return () => {
      if (pdfUrl()) {
        URL.revokeObjectURL(pdfUrl());
      }
    };
  });

  function handleClose() {
    onclose?.();
  }

  function downloadPdf() {
    if (!pdfUrl()) return;

    const link = document.createElement("a");
    link.href = pdfUrl();
    link.download = fileName || "document.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
</script>

<Modal bind:isOpen title={fileName} size="4xl" maxHeight="full" onclose={handleClose}>
  {#snippet body()}
    {#if pdfUrl()}
      <div class="h-full flex flex-col">
        <!-- PDF Controls -->
        <div class="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
          <span class="text-sm text-gray-600 truncate">{filePath}</span>
          <button
            onclick={downloadPdf}
            class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
            Download
          </button>
        </div>

        <!-- PDF Viewer -->
        <div class="flex-1 border border-gray-300 rounded-lg overflow-hidden">
          <iframe
            src="{pdfUrl()}#view=FitH"
            title="PDF Viewer - {fileName}"
            class="w-full h-full min-h-[600px]"
            style="border: none;"
          ></iframe>
        </div>
      </div>
    {:else}
      <div class="flex items-center justify-center h-64">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Loading PDF...</p>
        </div>
      </div>
    {/if}
  {/snippet}
</Modal>
