<script lang="ts">
  import { onMount } from "svelte";

  let { children }: { children?: any } = $props();

  let containerRef: HTMLDivElement;
  let availableHeight = $state(0);
  let availableWidth = $state(0);
  let ready = $state(false);

  function calculateHeight() {
    if (containerRef && containerRef.parentElement) {
      const parent = containerRef.parentElement;

      const parentHeight = parent.clientHeight;
      const containerTop = containerRef.offsetTop;

      availableHeight = Math.max(0, parentHeight - containerTop);

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
    {#if children}
      {@render children()}
    {/if}
  {/if}
</div>
