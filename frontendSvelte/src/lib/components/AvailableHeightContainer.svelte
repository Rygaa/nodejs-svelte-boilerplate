<script lang="ts">
  import { onMount } from "svelte";

  let containerRef: HTMLDivElement;
  let availableHeight = 0;
  let availableWidth = 0;
  let ready = false;

  function calculateHeight() {
    if (containerRef && containerRef.parentElement) {
      const parent = containerRef.parentElement;

      // Get parent's height and container's position within it
      const parentHeight = parent.clientHeight;
      const containerTop = containerRef.offsetTop;

      // Available height = parent height - space above container
      availableHeight = Math.max(0, parentHeight - containerTop);

      // Take into consideration the parent padding and borders
      const parentStyles = getComputedStyle(parent);
      const parentHoritzontalPadding =
        parseFloat(parentStyles.paddingLeft) + parseFloat(parentStyles.paddingRight);
      const parentHorizontalBorder =
        parseFloat(parentStyles.borderLeftWidth) + parseFloat(parentStyles.borderRightWidth);
      availableWidth = Math.max(0, parent.clientWidth - parentHoritzontalPadding - parentHorizontalBorder);
      ready = true;
    }
  }

  onMount(() => {
    calculateHeight();

    window.addEventListener("resize", calculateHeight);

    return () => {
      window.removeEventListener("resize", calculateHeight);
    };
  });
</script>

<div
  bind:this={containerRef}
  style="height: {ready ? availableHeight + 'px' : '0'}; overflow: auto; width: {availableWidth}px;"
>
  {#if ready}
    <slot />
  {/if}
</div>
