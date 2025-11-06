<script lang="ts">
  import { onMount } from "svelte";

  // Props
  let {
    iconName,
    title = "",
    class: className = "",
    ariaHidden = true,
    showPlaceholder = false,
    placeholderText = "?",
    size = 24, // numeric or string
  }: any = $props();

  // State
  let svgContent = $state<string>("");
  let isLoading = $state<boolean>(true);
  let hasError = $state<boolean>(false);

  // Load icons at build time
  const iconModules = import.meta.glob("../../assets/icons/*.svg", {
    query: "?raw",
    import: "default",
  });

  const iconMap = Object.fromEntries(
    Object.entries(iconModules).map(([path, importFn]) => {
      const filename = path.split("/").pop()?.replace(".svg", "") || "";
      return [filename, importFn];
    })
  );

  async function loadIcon(name: string) {
    isLoading = true;
    hasError = false;
    svgContent = "";

    const importFn = iconMap[name];
    if (!importFn) {
      hasError = true;
      isLoading = false;
      return;
    }

    const content = (await importFn()) as string;
    const sanitizedContent = sanitizeSvg(content);
    svgContent = addAttributesToSvg(sanitizedContent, className, title, ariaHidden);
    isLoading = false;
  }

  // Strip unsafe content
  function sanitizeSvg(content: string): string {
    return content
      .replace(/<\?xml[^>]*>/gi, "")
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
      .replace(/\s*javascript\s*:/gi, "");
  }

  // Inject attributes without breaking ratio
  function addAttributesToSvg(content: string, cssClass: string, svgTitle: string, hidden: boolean): string {
    let modifiedContent = content;
    const svgTagMatch = modifiedContent.match(/<svg([^>]*)>/i);
    if (!svgTagMatch) return modifiedContent;

    let attributes = svgTagMatch[1];

    if (cssClass) {
      if (attributes.includes("class=")) {
        attributes = attributes.replace(/class\s*=\s*["']([^"']*)["']/i, `class="$1 ${cssClass}"`);
      } else {
        attributes += ` class="${cssClass}"`;
      }
    }

    const originalWidthMatch = attributes.match(/width\s*=\s*["']([^"']*)["']/i);
    const originalHeightMatch = attributes.match(/height\s*=\s*["']([^"']*)["']/i);
    const viewBoxMatch = attributes.match(/viewBox\s*=\s*["']([^"']*)["']/i);

    let viewBoxValue = "0 0 24 24";
    if (viewBoxMatch) {
      viewBoxValue = viewBoxMatch[1];
    } else if (originalWidthMatch && originalHeightMatch) {
      const origWidth = originalWidthMatch[1];
      const origHeight = originalHeightMatch[1];
      viewBoxValue = `0 0 ${origWidth} ${origHeight}`;
    }

    // Preserve ratio by setting only width and clearing height
    if (/width=/.test(attributes)) {
      attributes = attributes.replace(/width\s*=\s*["'][^"']*["']/i, `width="${size}"`);
    } else {
      attributes += ` width="${size}"`;
    }
    attributes = attributes.replace(/height\s*=\s*["'][^"']*["']/i, "");
    if (!/preserveAspectRatio=/.test(attributes)) {
      attributes += ` preserveAspectRatio="xMidYMid meet"`;
    }

    if (/viewBox=/.test(attributes)) {
      // keep existing
    } else {
      attributes += ` viewBox="${viewBoxValue}"`;
    }

    if (svgTitle) {
      attributes += ` aria-labelledby="icon-title-${iconName}"`;
      const titleElement = `<title id="icon-title-${iconName}">${svgTitle}</title>`;
      modifiedContent = modifiedContent.replace(/<svg[^>]*>/i, (m) => m + titleElement);
    } else if (hidden) {
      attributes += ` aria-hidden="true"`;
    }

    modifiedContent = modifiedContent.replace(/<svg[^>]*>/i, `<svg${attributes}>`);
    return modifiedContent;
  }

  onMount(() => {
    loadIcon(iconName);
  });

  $effect(() => {
    loadIcon(iconName);
  });

  const shouldHideFromScreenReader = $derived(title ? false : ariaHidden);
</script>

{#if isLoading}
  <span class="inline-block w-4 h-4 animate-pulse bg-gray-300 rounded {className}" aria-hidden="true"></span>
{:else if hasError}
  {#if showPlaceholder}
    <span
      class="inline-flex items-center justify-center w-4 h-4 text-xs text-gray-400 border border-dashed border-gray-300 rounded {className}"
      aria-hidden={shouldHideFromScreenReader}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      {placeholderText}
    </span>
  {/if}
{:else if svgContent}
  <div style="display:inline-block; width:{size}px; height:auto; line-height:0;">
    {@html svgContent}
  </div>
{/if}
