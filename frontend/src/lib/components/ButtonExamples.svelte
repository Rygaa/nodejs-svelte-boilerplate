<!-- Example usage of the updated Button component with icons -->
<script lang="ts">
  import Button from "./Button.svelte";
</script>

<div class="button-examples">
  <h2>Button Component with Icon Examples</h2>

  <!-- Icon-only buttons -->
  <div class="example-section">
    <h3>Icon-Only Buttons</h3>
    <Button icon="home" iconOnly variant="primary" size="sm" />
    <Button icon="star" iconOnly variant="secondary" size="md" />
    <Button icon="heart" iconOnly variant="danger" size="lg" />
    <Button icon="settings" iconOnly variant="ghost" size="xl" />
  </div>

  <!-- Buttons with icons and text -->
  <div class="example-section">
    <h3>Buttons with Icons and Text</h3>
    <Button icon="home" text="Home" variant="primary" />
    <Button icon="star" text="Favorite" variant="success" />
    <Button icon="download" text="Download" variant="outline" />
  </div>

  <!-- Icon positioning -->
  <div class="example-section">
    <h3>Icon Positioning</h3>
    <Button icon="home" text="Left Icon" variant="primary" />
    <Button icon="arrow" text="Right Icon" variant="secondary" iconRight />
  </div>

  <!-- Different sizes with icons -->
  <div class="example-section">
    <h3>Different Sizes</h3>
    <Button icon="home" text="Extra Small" size="xs" variant="primary" />
    <Button icon="home" text="Small" size="sm" variant="primary" />
    <Button icon="home" text="Medium" size="md" variant="primary" />
    <Button icon="home" text="Large" size="lg" variant="primary" />
    <Button icon="home" text="Extra Large" size="xl" variant="primary" />
  </div>

  <!-- Different variants with icons -->
  <div class="example-section">
    <h3>Different Variants</h3>
    <Button icon="check" text="Primary" variant="primary" />
    <Button icon="info" text="Secondary" variant="secondary" />
    <Button icon="warning" text="Outline" variant="outline" />
    <Button icon="user" text="Ghost" variant="ghost" />
    <Button icon="x" text="Danger" variant="danger" />
    <Button icon="check" text="Success" variant="success" />
  </div>

  <!-- Loading state with icon -->
  <div class="example-section">
    <h3>Loading State</h3>
    <Button icon="save" text="Save" variant="primary" loading />
    <Button icon="upload" iconOnly variant="secondary" loading />
  </div>

  <!-- Custom icon handling (fallback to slots) -->
  <div class="example-section">
    <h3>Custom Icons (using slots)</h3>
    <Button text="Custom Left" variant="primary">
      <svelte:fragment slot="iconLeft">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          />
        </svg>
      </svelte:fragment>
    </Button>

    <Button text="Custom Right" variant="secondary">
      <svelte:fragment slot="iconRight">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
          />
        </svg>
      </svelte:fragment>
    </Button>
  </div>
</div>

<style>
  .button-examples {
    padding: 20px;
    max-width: 800px;
  }

  .example-section {
    margin: 30px 0;
  }

  .example-section h3 {
    margin-bottom: 15px;
    font-size: 18px;
    font-weight: 600;
    color: #374151;
  }

  .example-section {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  .example-section h3 {
    width: 100%;
    margin-bottom: 10px;
  }
</style>
