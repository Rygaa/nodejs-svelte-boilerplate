<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { fade } from "svelte/transition";

  // Props
  export let text: string = "";
  export let variant: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" = "primary";
  export let size: "xs" | "sm" | "md" | "lg" | "xl" = "md";
  export let disabled: boolean = false;
  export let loading: boolean = false;
  export let fullWidth: boolean = false;
  export let rounded: "none" | "sm" | "md" | "lg" | "full" = "md";
  export let type: "button" | "submit" | "reset" = "button";
  export let href: string = "";
  export let target: string = "";
  export let rel: string = "";
  export let iconOnly: boolean = false;
  export let ripple: boolean = true;
  export let tooltip: string = "";

  // Icon props
  export let iconLeft: boolean = false;
  export let iconRight: boolean = false;

  const dispatch = createEventDispatcher();

  // Handle click with ripple effect
  let ripples: Array<{ x: number; y: number; size: number; id: number }> = [];
  let nextRippleId = 0;

  function handleClick(e: MouseEvent) {
    if (disabled || loading) return;

    dispatch("click", e);

    if (ripple && !href) {
      const button = e.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const rippleId = nextRippleId++;
      ripples = [...ripples, { x, y, size, id: rippleId }];

      setTimeout(() => {
        ripples = ripples.filter((r) => r.id !== rippleId);
      }, 600);
    }
  }

  // Variant styles
  const variantClasses: Record<typeof variant, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800",
    outline: "bg-transparent text-gray-700 border-2 border-gray-300 hover:bg-gray-50 active:bg-gray-100",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200",
    danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
    success: "bg-green-600 text-white hover:bg-green-700 active:bg-green-800",
  };

  // Size styles
  const sizeClasses: Record<typeof size, string> = {
    xs: iconOnly ? "p-1" : "px-2.5 py-1.5 text-xs",
    sm: iconOnly ? "p-1.5" : "px-3 py-2 text-sm",
    md: iconOnly ? "p-2" : "px-4 py-2.5 text-base",
    lg: iconOnly ? "p-2.5" : "px-5 py-3 text-lg",
    xl: iconOnly ? "p-3" : "px-6 py-3.5 text-xl",
  };

  // Icon size based on button size
  const iconSizes: Record<typeof size, string> = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-7 h-7",
  };

  // Rounded styles
  const roundedClasses: Record<typeof rounded, string> = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  };

  // Combined classes
  $: buttonClasses = [
    "relative inline-flex items-center justify-center font-medium transition-all duration-200",
    "focus:outline-none",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    variantClasses[variant],
    sizeClasses[size],
    roundedClasses[rounded],
    fullWidth ? "w-full" : "",
    loading ? "cursor-wait" : "",
    "overflow-hidden",
  ]
    .filter(Boolean)
    .join(" ");

  // Loading spinner component
  const spinnerSizes: Record<typeof size, string> = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-7 h-7",
  };
</script>

<!-- Wrapper for tooltip and full width -->
<div class="relative inline-flex {fullWidth ? 'w-full' : ''}" title={tooltip}>
  {#if href && !disabled}
    <!-- Link Button -->
    <a {href} {target} {rel} class={buttonClasses} class:pointer-events-none={loading} on:click={handleClick}>
      {#if loading}
        <span class="absolute inset-0 flex items-center justify-center">
          <svg
            class="animate-spin {spinnerSizes[size]}"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      {/if}

      <span class:opacity-0={loading} class="inline-flex items-center gap-2">
        {#if $$slots.iconLeft || iconLeft}
          <span class={iconSizes[size]}>
            <slot name="iconLeft" />
          </span>
        {/if}

        {#if !iconOnly}
          {#if text}
            {text}
          {:else}
            <slot />
          {/if}
        {/if}

        {#if $$slots.iconRight || iconRight}
          <span class={iconSizes[size]}>
            <slot name="iconRight" />
          </span>
        {/if}
      </span>

      <!-- Ripple effects -->
      {#each ripples as ripple (ripple.id)}
        <span
          class="absolute bg-white bg-opacity-30 rounded-full pointer-events-none animate-ripple"
          style="
          left: {ripple.x}px;
          top: {ripple.y}px;
          width: {ripple.size}px;
          height: {ripple.size}px;
        "
        />
      {/each}
    </a>
  {:else}
    <!-- Regular Button -->
    <button
      {type}
      {disabled}
      class={buttonClasses}
      class:pointer-events-none={loading}
      on:click={handleClick}
      on:mouseenter
      on:mouseleave
      on:mousedown
      on:mouseup
      on:focus
      on:blur
      on:keydown
      on:keyup
    >
      {#if loading}
        <span class="absolute inset-0 flex items-center justify-center">
          <svg
            class="animate-spin {spinnerSizes[size]}"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      {/if}

      <span class:opacity-0={loading} class="inline-flex items-center gap-2">
        {#if $$slots.iconLeft || iconLeft}
          <span class={iconSizes[size]}>
            <slot name="iconLeft" />
          </span>
        {/if}

        {#if !iconOnly}
          {#if text}
            {text}
          {:else}
            <slot />
          {/if}
        {/if}

        {#if $$slots.iconRight || iconRight}
          <span class={iconSizes[size]}>
            <slot name="iconRight" />
          </span>
        {/if}
      </span>

      <!-- Ripple effects -->
      {#each ripples as ripple (ripple.id)}
        <span
          class="absolute bg-white bg-opacity-30 rounded-full pointer-events-none animate-ripple"
          style="
          left: {ripple.x}px;
          top: {ripple.y}px;
          width: {ripple.size}px;
          height: {ripple.size}px;
        "
        />
      {/each}
    </button>
  {/if}
</div>

<style>
  @keyframes ripple {
    to {
      transform: scale(1);
      opacity: 0;
    }
  }

  :global(.animate-ripple) {
    animation: ripple 0.6s ease-out;
    transform: scale(0);
  }

  /* Ensure button text isn't selectable during interactions */
  button,
  a {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  /* Smooth loading state transition */
  button > span,
  a > span {
    transition: opacity 0.2s ease-in-out;
  }
</style>
