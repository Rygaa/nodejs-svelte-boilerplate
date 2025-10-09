<script lang="ts">
  import { onMount } from "svelte";
  import { authStore } from "../store/auth.store";
  import { trpc } from "../config/trpc";
  import Button from "../lib/components/Button.svelte";

  let isLoading = true;
  let scripts: any[] = [];
  let error = "";
  let success = "";
  let currentUser: any = null;

  // Script execution state
  let isExecuting = false;
  let selectedScript = "";
  let scriptParams = "";
  let executionResult: any = null;

  async function loadScripts() {
    try {
      isLoading = true;
      error = "";
      const result = await trpc.script.listScripts.query();
      scripts = result.scripts;
      success = `Loaded ${result.scripts.length} scripts`;
    } catch (err: any) {
      error = err?.message || "Failed to load scripts";
    } finally {
      isLoading = false;
    }
  }

  async function executeScript(scriptName: string) {
    try {
      isExecuting = true;
      executionResult = null;
      error = "";

      // Parse parameters if provided
      let params = {};
      if (scriptParams.trim()) {
        try {
          params = JSON.parse(scriptParams.trim());
        } catch (parseError) {
          throw new Error(
            'Invalid JSON in parameters field. Make sure to use double quotes around property names. Example: {"maxCombinations": 1}'
          );
        }
      }

      const result = await trpc.script.execute.mutate({
        scriptName,
        params,
      });

      executionResult = result;

      if (result.success) {
        success = `Script "${scriptName}" executed successfully`;
      } else {
        error = `Script "${scriptName}" failed: ${result.error || "Unknown error"}`;
      }
    } catch (err: any) {
      error = err?.message || "Failed to execute script";
    } finally {
      isExecuting = false;
    }
  }

  function handleExecuteSelected() {
    if (!selectedScript) {
      error = "Please select a script to execute";
      return;
    }
    executeScript(selectedScript);
  }

  onMount(() => {
    const unsubscribe = authStore.subscribe((auth) => {
      currentUser = auth.user;
      if (auth.isAuthenticated && auth.user?.role === "ROOT") {
        loadScripts();
      } else if (auth.isAuthenticated && auth.user) {
        error = "Access denied: Only ROOT users can access the Scripts page";
        isLoading = false;
      }
    });

    return unsubscribe;
  });
</script>

<div class="p-6">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-2">Scripts</h1>
    <p class="text-gray-600">Manage and execute scripts for various tasks and maintenance operations.</p>
  </div>

  <!-- Messages -->
  {#if error}
    <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
      <div class="flex">
        <span class="text-red-500 text-xl mr-3">❌</span>
        <div>
          <h3 class="text-sm font-medium text-red-800">Error</h3>
          <p class="text-sm text-red-700">{error}</p>
        </div>
      </div>
    </div>
  {/if}

  {#if success}
    <div class="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
      <div class="flex">
        <span class="text-green-500 text-xl mr-3">✅</span>
        <div>
          <h3 class="text-sm font-medium text-green-800">Success</h3>
          <p class="text-sm text-green-700">{success}</p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Script Execution Panel -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    <!-- Script Selector -->
    <div class="bg-white shadow rounded-lg p-6">
      <h2 class="text-lg font-medium text-gray-900 mb-4">Execute Script</h2>

      <div class="space-y-4">
        <div>
          <label for="script-select" class="block text-sm font-medium text-gray-700 mb-2">
            Select Script
          </label>
          <select
            id="script-select"
            bind:value={selectedScript}
            disabled={isExecuting}
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
          >
            <option value="">Choose a script...</option>
            {#each scripts as script}
              <option value={script.name}>
                📜 {script.name}
              </option>
            {/each}
          </select>
        </div>

        <div>
          <label for="script-params" class="block text-sm font-medium text-gray-700 mb-2">
            Parameters (JSON)
          </label>
          <textarea
            id="script-params"
            bind:value={scriptParams}
            disabled={isExecuting}
            placeholder="Enter JSON parameters here, e.g. maxCombinations, delayBetweenRequests"
            rows="4"
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 font-mono text-sm"
          ></textarea>
          <p class="mt-1 text-xs text-gray-500">
            Optional JSON parameters to pass to the script. Leave empty for default parameters.
            <br />
            <span class="text-gray-400"
              >⚠️ Use valid JSON syntax with double quotes around property names.</span
            >
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          fullWidth={true}
          disabled={isExecuting || !selectedScript}
          loading={isExecuting}
          text={isExecuting ? "Executing..." : "Execute Script"}
          on:click={handleExecuteSelected}
        />
      </div>
    </div>

    <!-- Execution Result -->
    {#if executionResult}
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Execution Result</h2>

        <div class="space-y-4">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">Script:</span>
            <span class="font-mono">{executionResult.scriptName}</span>
          </div>

          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">Status:</span>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {executionResult.success
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'}"
            >
              {executionResult.success ? "Success" : "Failed"}
            </span>
          </div>

          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">Execution Time:</span>
            <span class="font-mono">{executionResult.executionTime || 0}ms</span>
          </div>

          {#if executionResult.output}
            <div>
              <div class="block text-sm font-medium text-gray-700 mb-2">Output:</div>
              <pre
                class="bg-gray-50 border rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{executionResult.output}</pre>
            </div>
          {/if}

          {#if executionResult.error}
            <div>
              <div class="block text-sm font-medium text-red-700 mb-2">Error:</div>
              <pre
                class="bg-red-50 border border-red-200 rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{executionResult.error}</pre>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Available Scripts List -->
  <div class="bg-white shadow rounded-lg">
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-medium text-gray-900">Available Scripts</h2>
        <Button
          variant="primary"
          size="sm"
          disabled={isLoading}
          loading={isLoading}
          text={isLoading ? "Loading..." : "Refresh"}
          on:click={loadScripts}
        />
      </div>
    </div>

    <div class="divide-y divide-gray-200">
      {#if isLoading}
        <div class="p-6">
          <div class="animate-pulse space-y-4">
            {#each Array(3) as _}
              <div class="flex items-center space-x-4">
                <div class="h-12 w-12 bg-gray-200 rounded"></div>
                <div class="flex-1">
                  <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div class="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div class="h-8 w-20 bg-gray-200 rounded"></div>
              </div>
            {/each}
          </div>
        </div>
      {:else if scripts.length > 0}
        {#each scripts as script}
          <div class="p-6 hover:bg-gray-50">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="text-2xl">📜</div>
                <div>
                  <h3 class="text-sm font-medium text-gray-900">{script.name}</h3>
                  <div class="mt-1 flex items-center text-xs text-gray-500 space-x-4">
                    <span>File: {script.filename}</span>
                    <span>Size: {Math.round((script.size / 1024) * 100) / 100} KB</span>
                    <span>Modified: {new Date(script.lastModified).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <Button
                variant="success"
                size="sm"
                disabled={isExecuting}
                loading={isExecuting}
                text={isExecuting ? "Running..." : "Execute"}
                on:click={() => executeScript(script.name)}
              />
            </div>
          </div>
        {/each}
      {:else}
        <div class="text-center py-12">
          <span class="text-4xl mb-4 block">📜</span>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No scripts found</h3>
          <p class="text-gray-500">Add JavaScript files to the /scripts folder to get started</p>
        </div>
      {/if}
    </div>
  </div>
</div>
