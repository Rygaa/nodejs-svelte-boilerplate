<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { fade, scale } from "svelte/transition";
  import Button from "./Button.svelte";

  // Props
  export let isOpen: boolean = false;
  export let title: string = "";
  export let size: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full" = "md";
  export let closeOnBackdrop: boolean = true;
  export let closeOnEscape: boolean = true;
  export let showCloseButton: boolean = true;
  export let maxHeight: "sm" | "md" | "lg" | "full" | "auto" = "lg";

  const dispatch = createEventDispatcher<{ close: void }>();

  // Size classes mapping
  const sizeClasses: Record<string, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    full: "max-w-full mx-4",
  };

  // Height classes mapping
  const heightClasses: Record<string, string> = {
    sm: "h-[40vh]",
    md: "h-[60vh]",
    lg: "h-[80vh]",
    full: "h-[95vh]",
    auto: "h-[90vh]", // Fallback to prevent modal from going off-screen
  };

  // Height classes mapping
  const maxHeightClasses: Record<string, string> = {
    sm: "max-h-[40vh]",
    md: "max-h-[60vh]",
    lg: "max-h-[80vh]",
    full: "max-h-[95vh]",
    auto: "max-h-[90vh]", // Fallback to prevent modal from going off-screen
  };

  // Handle backdrop click
  function handleBackdropClick(e: MouseEvent) {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      closeModal();
    }
  }

  // Handle escape key
  function handleKeydown(e: KeyboardEvent) {
    if (closeOnEscape && e.key === "Escape" && isOpen) {
      closeModal();
    }
  }

  // Close modal function
  function closeModal() {
    isOpen = false;
    dispatch("close");
  }

  // Focus trap management
  let modalElement: HTMLDivElement;
  let previousActiveElement: HTMLElement | null = null;

  onMount(() => {
    return () => {
      // Restore focus when modal closes
      if (previousActiveElement && document.body.contains(previousActiveElement)) {
        previousActiveElement.focus();
      }
    };
  });

  // Store previous focus and set initial focus when modal opens
  $: if (isOpen && modalElement) {
    previousActiveElement = document.activeElement as HTMLElement;
    // Focus the modal container for screen readers
    setTimeout(() => {
      const firstButton = modalElement.querySelector('button:not([tabindex="-1"])') as HTMLElement;
      if (firstButton) {
        firstButton.focus();
      } else {
        modalElement.focus();
      }
    }, 50);
  }

  // Prevent body scroll when modal is open
  $: if (typeof document !== "undefined") {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- Modal Root -->
  <div
    class="fixed inset-0 z-50 overflow-hidden"
    aria-labelledby="modal-title"
    role="dialog"
    aria-modal="true"
  >
    <!-- Background overlay -->
    <div
      transition:fade={{ duration: 200 }}
      class="fixed inset-0 bg-black bg-opacity-50 transition-opacity cursor-default"
      on:click={handleBackdropClick}
      on:keydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (closeOnBackdrop) closeModal();
        }
      }}
      aria-label="Close modal"
      role="button"
      tabindex="-1"
    />

    <!-- Modal positioning container -->
    <div class="fixed inset-0 overflow-hidden">
      <div class="flex min-h-full items-center justify-center p-4">
        <!-- Modal content -->
        <div
          bind:this={modalElement}
          transition:scale={{ duration: 200, start: 0.95 }}
          class="relative w-full {sizeClasses[size]} {heightClasses[maxHeight]} {maxHeightClasses[
            maxHeight
          ]} bg-white rounded-lg shadow-xl flex flex-col overflow-hidden"
          tabindex="-1"
        >
          <!-- Header (fixed) -->
          {#if title || showCloseButton}
            <div class="flex-shrink-0 border-b border-gray-200 px-6 py-4">
              <div class="flex items-center justify-between">
                {#if title}
                  <h3 class="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                    {title}
                  </h3>
                {:else}
                  <div />
                {/if}

                {#if showCloseButton}
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly={true}
                    on:click={closeModal}
                    tooltip="Close modal"
                  >
                    <svelte:fragment slot="iconLeft">
                      <svg
                        class="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </svelte:fragment>
                  </Button>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Body (scrollable) -->
          <div class="flex-1 overflow-y-auto px-6 py-4">
            <slot name="body">
              <slot />
            </slot>
          </div>

          <!-- Footer (fixed) -->
          {#if $$slots.footer}
            <div class="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-3">
              <slot name="footer" />
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Ensure smooth scrolling on mobile */
  :global(.modal-scroll) {
    -webkit-overflow-scrolling: touch;
  }

  /* Optional: Custom scrollbar styling */
  .overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 #f7fafc;
  }

  .overflow-y-auto::-webkit-scrollbar {
    width: 8px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: #f7fafc;
    border-radius: 4px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: #cbd5e0;
    border-radius: 4px;
    border: 2px solid #f7fafc;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: #a0aec0;
  }
</style>
