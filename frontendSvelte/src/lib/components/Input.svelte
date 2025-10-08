<script lang="ts">
  export let label: string = "";
  export let id: string = "";
  export let name: string = "";
  export let type: string = "text";
  export let value: string = "";
  export let placeholder: string = "";
  export let required: boolean = false;
  export let disabled: boolean = false;
  export let readonly: boolean = false;
  export let error: string = "";
  export let helperText: string = "";
  export let autocomplete: string = "";
  export let maxlength: number | undefined = undefined;
  export let minlength: number | undefined = undefined;
  export let pattern: string = "";
  export let className: string = "";
  export let inputClassName: string = "";
  export let labelClassName: string = "";

  // Generate unique ID if not provided
  const componentId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  // Handle input events
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    value = target.value;
  }

  // Compute classes
  $: baseInputClasses = `appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
    error ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300"
  } ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"} ${inputClassName}`;

  $: baseLabelClasses = `block text-sm font-medium ${
    error ? "text-red-700" : "text-gray-700"
  } ${labelClassName}`;
</script>

<div class="w-full {className}">
  {#if label}
    <label for={componentId} class={baseLabelClasses}>
      {label}
      {#if required}
        <span class="text-red-500 ml-1">*</span>
      {/if}
    </label>
  {/if}

  <div class="mt-1">
    <input
      {id}
      {name}
      {type}
      {placeholder}
      {required}
      {disabled}
      {readonly}
      {autocomplete}
      {maxlength}
      {minlength}
      {pattern}
      {value}
      on:input={handleInput}
      on:blur
      on:focus
      on:keydown
      on:keyup
      on:change
      class={baseInputClasses}
    />
  </div>

  {#if error}
    <p class="mt-1 text-sm text-red-600" id="{componentId}-error">
      {error}
    </p>
  {/if}

  {#if helperText && !error}
    <p class="mt-1 text-sm text-gray-500" id="{componentId}-helper">
      {helperText}
    </p>
  {/if}
</div>
