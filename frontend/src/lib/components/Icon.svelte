<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import { writable, get } from "svelte/store";
  import { trpc } from "../../config/trpc";

  // Props
  export let isLoading = false;
  export let iconname: string | undefined = undefined;
  export let color: "white" | "black" | "icon" | "red" | "green" | "orange" | "text" | "NONtext" | string =
    "icon";
  export let size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number | string = "md";
  export let className = "";

  // Create a store for loaded icons (similar to Zustand)
  const loadedIcons = writable<Array<{ name: string; content: string }>>([]);
  const iconLoadCounts = writable<{ [key: string]: number }>({});

  let iconElement: HTMLDivElement;
  let iconContent = "";

  // Helper function to inject styles
  function injectStylesToOnlyChildren(element: HTMLDivElement, styles: Record<string, string>) {
    if (!element) return;

    // Apply styles to SVG elements specifically
    element.querySelectorAll("svg").forEach((svg: any) => {
      Object.entries(styles).forEach(([key, value]) => {
        svg.style[key] = value;
      });
    });

    // Apply styles to paths, circles, and other SVG children
    element.querySelectorAll("svg *").forEach((child: any) => {
      Object.entries(styles).forEach(([key, value]) => {
        child.style[key] = value;
        // For SVG elements, also set fill and stroke
        if (key === "color") {
          child.style.fill = value;
          child.style.stroke = value;
        }
      });
    });
  }

  // Helper function to convert color names to CSS values
  function getColorValue(color: string): string {
    const colorMap: { [key: string]: string } = {
      white: "#ffffff",
      black: "#000000",
      icon: "#6B7280", // gray-500
      red: "#EF4444", // red-500
      green: "#10B981", // green-500
      orange: "#F59E0B", // orange-500
      text: "#374151", // gray-700
      NONtext: "#9CA3AF", // gray-400
    };

    return colorMap[color] || color;
  }

  // Helper function to convert size names to CSS values
  function getSizeValue(size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number | string = "md"): string {
    const sizeMap: { [key: string]: string } = {
      xs: "12px",
      sm: "16px",
      md: "20px",
      lg: "24px",
      xl: "32px",
      "2xl": "40px",
    };

    // If it's a number, convert to px
    if (typeof size === "number") {
      return `${size}px`;
    }

    // If it's a string that's not in our map, return as-is
    return sizeMap[size] || size;
  }

  // Function to apply styles to the icon
  function applyStyles() {
    if (iconContent && iconElement) {
      const styles = {
        pointerEvents: "none",
        color: getColorValue(color),
        width: getSizeValue(size),
        height: getSizeValue(size),
      };

      // Use requestAnimationFrame for better timing
      const doApplyStyles = () => {
        injectStylesToOnlyChildren(iconElement, styles);
      };

      // Try immediately
      doApplyStyles();

      // Also try after next frame to catch late DOM updates
      requestAnimationFrame(() => {
        doApplyStyles();
      });

      // Fallback with small delay
      setTimeout(doApplyStyles, 10);
    }
  }

  // Function to increase loaded icon count (similar to Zustand action)
  function increaseLoadedIconCount(iconName: string) {
    iconLoadCounts.update((counts) => {
      const newCounts = { ...counts };
      newCounts[iconName] = (newCounts[iconName] || 0) + 1;
      return newCounts;
    });
  }

  // Load icons from the API
  async function loadIcons() {
    const icons = get(loadedIcons);
    if (icons.length === 0) {
      const response = await trpc.user.getIcons.query({});
      if (response.success) {
        loadedIcons.set(response.icons);
      }
    }
  }

  // Reactive statement to find the icon when loadedIcons changes
  $: {
    if (iconname) {
      const foundIcon = $loadedIcons.find((icon) => icon.name === `${iconname}.svg`);
      if (foundIcon && foundIcon.content) {
        iconContent = foundIcon.content;
      }
    }
  }

  // Reactive statement to apply styles when icon content, color, or size changes
  $: if (iconContent || color || size) {
    // Use a small delay to ensure DOM is updated
    setTimeout(applyStyles, 0);
  }

  onMount(async () => {
    if (iconname) {
      increaseLoadedIconCount(iconname);
      await loadIcons();
    }
  });

  afterUpdate(() => {
    applyStyles();
  });
</script>

{#if !isLoading}
  <div
    bind:this={iconElement}
    class="icon-styling {className}"
    style="display: flex; align-items: center; justify-content: center; pointer-events: auto;"
    on:click
    on:keydown
    role="button"
    tabindex="0"
    {...$$restProps}
  >
    {@html iconContent}
  </div>
{/if}

<style>
  .icon-styling {
    cursor: pointer;
    user-select: none;
  }
</style>
