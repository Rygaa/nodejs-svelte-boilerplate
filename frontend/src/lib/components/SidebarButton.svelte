<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Icon from "./Icon.svelte";

  // Props
  export let active: boolean = false;
  export let disabled: boolean = false;
  export let iconname: string = ""; // For Icon.svelte component
  export let text: string = "";
  export let variant: "default" | "admin" | "danger" = "default";

  const dispatch = createEventDispatcher();

  function handleClick(e: MouseEvent) {
    if (disabled) return;
    dispatch("click", e);
  }

  // Variant styles for active and inactive states
  const variantClasses = {
    default: {
      active: "bg-indigo-100 text-indigo-700 border-indigo-500",
      inactive: "text-gray-700 hover:bg-gray-100",
    },
    admin: {
      active: "bg-red-100 text-red-700  border-red-500",
      inactive: "text-gray-700 hover:bg-gray-100",
    },
    danger: {
      active: "bg-red-50 text-red-600",
      inactive: "text-red-600 hover:bg-red-50",
    },
  };

  $: buttonClasses = [
    "w-full flex items-center px-4 py-2 text-left rounded-lg transition-colors duration-200",
    "focus:outline-none",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    active ? variantClasses[variant].active : variantClasses[variant].inactive,
  ].join(" ");

  $: iconColor = (() => {
    if (variant === "danger") return "red";
    if (variant === "admin" && active) return "red";
    if (active) return "text";
    return "NONtext";
  })();
</script>

<button {disabled} class={buttonClasses} on:click={handleClick}>
  {#if iconname}
    <div class="mr-3">
      <Icon {iconname} size="sm" color={iconColor} />
    </div>
  {/if}

  {#if text}
    <span class="font-medium truncate">{text}</span>
  {:else}
    <div class="truncate">
      <slot />
    </div>
  {/if}
</button>
