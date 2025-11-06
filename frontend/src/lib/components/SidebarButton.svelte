<script lang="ts">
  // Props
  let {
    active = false,
    disabled = false,
    icon = "",
    text = "",
    variant = "default",
    onclick,
    children,
  }: {
    active?: boolean;
    disabled?: boolean;
    icon?: string;
    text?: string;
    variant?: "default" | "admin" | "danger";
    onclick?: (e: MouseEvent) => void;
    children?: any;
  } = $props();

  function handleClick(e: MouseEvent) {
    if (disabled) return;
    onclick?.(e);
  }

  // Variant styles for active and inactive states
  const variantClasses = {
    default: {
      active: "bg-indigo-100 text-indigo-700 border-r-2 border-indigo-500",
      inactive: "text-gray-700 hover:bg-gray-100",
    },
    admin: {
      active: "bg-red-100 text-red-700 border-r-2 border-red-500",
      inactive: "text-gray-700 hover:bg-gray-100",
    },
    danger: {
      active: "bg-red-50 text-red-600",
      inactive: "text-red-600 hover:bg-red-50",
    },
  };

  const buttonClasses = $derived(
    [
      "w-full flex items-center px-4 py-2 text-left rounded-lg transition-colors duration-200",
      "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      active ? variantClasses[variant].active : variantClasses[variant].inactive,
    ].join(" ")
  );
</script>

<button {disabled} class={buttonClasses} onclick={handleClick}>
  {#if icon}
    <span class="text-lg mr-3">{icon}</span>
  {/if}

  {#if text}
    <span class="font-medium">{text}</span>
  {/if}

  {#if !text && children}
    {@render children()}
  {/if}
</button>
