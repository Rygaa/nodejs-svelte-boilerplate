<script lang="ts">
  import type { Snippet } from "svelte";

  // Props using Svelte 5 runes
  let {
    label = "",
    id = "",
    name = "",
    type = "text",
    value = $bindable(""),
    placeholder = "",
    required = false,
    disabled = false,
    readonly = false,
    error = "",
    helperText = "",
    autocomplete = "",
    maxlength = undefined,
    minlength = undefined,
    pattern = "",
    className = "",
    inputClassName = "",
    labelClassName = "",
    oninput,
    onblur,
    onfocus,
    onkeydown,
    onkeyup,
    onchange,
  }: {
    label?: string;
    id?: string;
    name?: string;
    type?: string;
    value?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    error?: string;
    helperText?: string;
    autocomplete?: string;
    maxlength?: number;
    minlength?: number;
    pattern?: string;
    className?: string;
    inputClassName?: string;
    labelClassName?: string;
    oninput?: (event: Event) => void;
    onblur?: (event: FocusEvent) => void;
    onfocus?: (event: FocusEvent) => void;
    onkeydown?: (event: KeyboardEvent) => void;
    onkeyup?: (event: KeyboardEvent) => void;
    onchange?: (event: Event) => void;
  } = $props();

  // Generate unique ID if not provided
  const componentId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  // Handle input events
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    value = target.value;
    oninput?.(event);
  }

  // Compute classes using $derived
  const baseInputClasses = $derived(
    `appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
      error ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300"
    } ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"} ${inputClassName}`
  );

  const baseLabelClasses = $derived(
    `block text-sm font-medium ${error ? "text-red-700" : "text-gray-700"} ${labelClassName}`
  );
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
      id={componentId}
      {name}
      {type}
      {placeholder}
      {required}
      {disabled}
      {readonly}
      autocomplete={autocomplete as any}
      {maxlength}
      {minlength}
      {pattern}
      {value}
      oninput={handleInput}
      {onblur}
      {onfocus}
      {onkeydown}
      {onkeyup}
      {onchange}
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
