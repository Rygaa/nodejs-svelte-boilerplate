<!-- Example usage of the Icon component -->
<script lang="ts">
  import Icon from "./Icon.svelte";
</script>

<div class="icon-examples">
  <h2>Icon Component Examples</h2>

  <!-- Different sizes -->
  <div class="example-section">
    <h3>Sizes</h3>
    <Icon iconname="home" size="xs" />
    <Icon iconname="home" size="sm" />
    <Icon iconname="home" size="md" />
    <Icon iconname="home" size="lg" />
    <Icon iconname="home" size="xl" />
    <Icon iconname="home" size="2xl" />
  </div>

  <!-- Different colors -->
  <div class="example-section">
    <h3>Colors</h3>
    <Icon iconname="home" color="red" />
    <Icon iconname="home" color="green" />
    <Icon iconname="home" color="orange" />
    <Icon iconname="home" color="white" />
    <Icon iconname="home" color="black" />
  </div>

  <!-- With click handler -->
  <div class="example-section">
    <h3>Interactive</h3>
    <Icon iconname="home" color="red" size="lg" on:click={() => alert("Icon clicked!")} />
  </div>

  <!-- Custom size -->
  <div class="example-section">
    <h3>Custom Size</h3>
    <Icon iconname="home" size={48} />
  </div>
</div>

<style>
  .icon-examples {
    padding: 20px;
  }

  .example-section {
    margin: 20px 0;
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .example-section h3 {
    margin-right: 20px;
    min-width: 100px;
  }
</style>
