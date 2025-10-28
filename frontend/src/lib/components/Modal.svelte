<script lang="ts">
  import { onMount } from "svelte";
  import { fade, scale } from "svelte/transition";
  import type { Snippet } from "svelte";
  import Button from "./Button.svelte";

  // Props using Svelte 5 runes
  let {
    isOpen = $bindable(false),
    title = "",
    size = "md" as "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full",
    closeOnBackdrop = true,
    closeOnEscape = true,
    showCloseButton = true,
    maxHeight = "lg" as "sm" | "md" | "lg" | "full" | "auto",
    onclose,
    children,
    body,
    footer,
  }: {
    isOpen?: boolean;
    title?: string;
    size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full";
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
    showCloseButton?: boolean;
    maxHeight?: "sm" | "md" | "lg" | "full" | "auto";
    onclose?: () => void | Promise<void>;
    children?: Snippet;
    body?: Snippet;
    footer?: Snippet;
  } = $props();

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
    onclose?.();
  }

  // Focus trap management
  let modalElement = $state<HTMLDivElement>();
  let previousActiveElement = $state<HTMLElement | null>(null);

  onMount(() => {
    return () => {
      // Restore focus when modal closes
      if (previousActiveElement && document.body.contains(previousActiveElement)) {
        previousActiveElement.focus();
      }
    };
  });

  // Store previous focus and set initial focus when modal opens using $effect
  $effect(() => {
    if (isOpen && modalElement) {
      previousActiveElement = document.activeElement as HTMLElement;
      // Focus the modal container for screen readers
      setTimeout(() => {
        if (modalElement) {
          const firstButton = modalElement.querySelector('button:not([tabindex="-1"])') as HTMLElement;
          if (firstButton) {
            firstButton.focus();
          } else {
            modalElement.focus();
          }
        }
      }, 50);
    }
  });

  // Prevent body scroll when modal is open using $effect
  $effect(() => {
    if (typeof document !== "undefined") {
      if (isOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

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
      onclick={handleBackdropClick}
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (closeOnBackdrop) closeModal();
        }
      }}
      aria-label="Close modal"
      role="button"
      tabindex="-1"
    ></div>

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
                  <div></div>
                {/if}

                {#if showCloseButton}
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly={true}
                    onclick={closeModal}
                    tooltip="Close modal"
                  >
                    {#snippet iconLeft()}
                      <svg
                        class="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    {/snippet}
                  </Button>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Body (scrollable) -->
          <div
            class="flex-1 overflow-y-auto px-6 py-4 [-webkit-overflow-scrolling:touch] scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 scrollbar-track-rounded scrollbar-thumb-rounded"
          >
            {#if body}
              {@render body()}
            {:else if children}
              {@render children()}
            {/if}
          </div>

          <!-- Footer (fixed) -->
          {#if footer}
            <div class="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-3">
              {@render footer()}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
