<script lang="ts">
  import { onMount } from "svelte";
  import { authStore } from "../store/auth.store";
  import { trpc } from "../config/trpc";
  import Button from "../lib/components/Button.svelte";

  let isLoading = true;
  let scripts: any[] = [];
  let managedScripts: any[] = []; // From script manager
  let error = "";
  let success = "";
  let currentUser: any = null;

  // Script execution state
  let isExecuting = false;
  let selectedScript = "";
  let scriptParams = "";
  let executionResult: any = null;

  // Loop execution state
  let loopCount = 1;
  let waitTimeBetweenExecution = 1000; // milliseconds
  let isLoopExecuting = false;
  let currentLoop = 0;
  let loopResults: any[] = [];
  let loopProgress = "";

  // Script management state
  let isUpdatingConfig = false;
  let selectedManagedScript: any = null;
  let showConfigModal = false;

  async function loadScripts() {
    try {
      isLoading = true;
      error = "";

      // Load managed scripts
      const managedResult = await trpc.script.getScripts.query({});

      scripts = managedResult.scripts;
      managedScripts = managedResult.scripts;

      success = `Loaded ${managedResult.scripts.length} managed scripts`;
    } catch (err: any) {
      error = err?.message || "Failed to load scripts";
    } finally {
      isLoading = false;
    }
  }

  async function updateScriptConfig(scriptName: string, updates: any) {
    try {
      isUpdatingConfig = true;
      error = "";

      await trpc.script.updateConfig.mutate({
        scriptName,
        ...updates,
      });

      // Reload managed scripts to show updated config
      await loadScripts();
      success = `Updated configuration for ${scriptName}`;
    } catch (err: any) {
      error = err?.message || "Failed to update script configuration";
    } finally {
      isUpdatingConfig = false;
    }
  }

  function openConfigModal(script: any) {
    selectedManagedScript = { ...script };
    showConfigModal = true;
  }

  function closeConfigModal() {
    selectedManagedScript = null;
    showConfigModal = false;
  }

  async function saveScriptConfig() {
    if (!selectedManagedScript) return;

    await updateScriptConfig(selectedManagedScript.name, {
      autoRun: selectedManagedScript.autoRun,
      waitTime: selectedManagedScript.waitTime,
      enabled: selectedManagedScript.enabled,
      description: selectedManagedScript.description,
    });

    closeConfigModal();
  }

  function formatWaitTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  function formatNextRun(nextRunISO: string): string {
    if (!nextRunISO) return "Not scheduled";
    const nextRun = new Date(nextRunISO);
    const now = new Date();
    const diff = nextRun.getTime() - now.getTime();

    if (diff <= 0) return "Ready to run";

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `in ${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `in ${hours}h ${minutes % 60}m`;
    } else {
      return `in ${minutes}m`;
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

      return result;
    } catch (err: any) {
      error = err?.message || "Failed to execute script";
      throw err;
    } finally {
      isExecuting = false;
    }
  }

  async function executeScriptLoop() {
    if (!selectedScript) {
      error = "Please select a script to execute";
      return;
    }

    try {
      isLoopExecuting = true;
      loopResults = [];
      currentLoop = 0;
      error = "";
      success = "";

      for (let i = 1; i <= loopCount; i++) {
        currentLoop = i;
        loopProgress = `Executing ${selectedScript} - Loop ${i}/${loopCount}`;

        try {
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
            scriptName: selectedScript,
            params,
          });

          loopResults.push({
            loop: i,
            timestamp: new Date().toISOString(),
            success: result.success,
            result: result,
          });

          if (!result.success) {
            error = `Script failed on loop ${i}: ${result.error || "Unknown error"}`;
            break;
          }

          // Small delay between executions
          if (i < loopCount) {
            await new Promise((resolve) => setTimeout(resolve, waitTimeBetweenExecution));
          }
        } catch (err: any) {
          loopResults.push({
            loop: i,
            timestamp: new Date().toISOString(),
            success: false,
            error: err.message,
          });
          error = `Script failed on loop ${i}: ${err.message}`;
          break;
        }
      }

      if (!error) {
        success = `Successfully completed ${loopCount} loops of "${selectedScript}"`;
      }

      loopProgress = "";
    } catch (err: any) {
      error = err?.message || "Failed to execute script loop";
      loopProgress = "";
    } finally {
      isLoopExecuting = false;
      currentLoop = 0;
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
            disabled={isExecuting || isLoopExecuting}
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
            disabled={isExecuting || isLoopExecuting}
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

        <div>
          <label for="loop-count" class="block text-sm font-medium text-gray-700 mb-2"> Loop Count </label>
          <input
            id="loop-count"
            type="number"
            min="1"
            max="100"
            bind:value={loopCount}
            disabled={isExecuting || isLoopExecuting}
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
          />
          <p class="mt-1 text-xs text-gray-500">
            Number of times to execute the script consecutively (1-100)
          </p>
        </div>

        <div>
          <label for="wait-time" class="block text-sm font-medium text-gray-700 mb-2">
            Wait Time Between Executions (ms)
          </label>
          <input
            id="wait-time"
            type="number"
            min="0"
            max="60000"
            step="100"
            bind:value={waitTimeBetweenExecution}
            disabled={isExecuting || isLoopExecuting}
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
          />
          <p class="mt-1 text-xs text-gray-500">
            Delay in milliseconds between each execution (0-60000ms). Default: 1000ms (1 second)
          </p>
        </div>

        <!-- Loop Progress -->
        {#if isLoopExecuting && loopProgress}
          <div class="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div class="flex items-center">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span class="text-sm text-blue-800">{loopProgress}</span>
            </div>
            <div class="mt-2">
              <div class="w-full bg-blue-200 rounded-full h-2">
                <div
                  class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style="width: {(currentLoop / loopCount) * 100}%"
                ></div>
              </div>
              <p class="text-xs text-blue-600 mt-1">{currentLoop}/{loopCount} completed</p>
            </div>
          </div>
        {/if}

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="primary"
            size="md"
            fullWidth={true}
            disabled={isExecuting || isLoopExecuting || !selectedScript}
            loading={isExecuting}
            text={isExecuting ? "Executing..." : "Execute Once"}
            on:click={handleExecuteSelected}
          />

          <Button
            variant="secondary"
            size="md"
            fullWidth={true}
            disabled={isExecuting || isLoopExecuting || !selectedScript}
            loading={isLoopExecuting}
            text={isLoopExecuting ? `Loop ${currentLoop}/${loopCount}` : `Execute ${loopCount}x`}
            on:click={executeScriptLoop}
          />
        </div>
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

    <!-- Loop Results -->
    {#if loopResults.length > 0}
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Loop Execution Results</h2>

        <div class="space-y-3">
          <div class="flex items-center justify-between text-sm border-b pb-2">
            <span class="font-medium text-gray-700">Total Loops:</span>
            <span class="font-mono">{loopResults.length}</span>
          </div>

          <div class="flex items-center justify-between text-sm border-b pb-2">
            <span class="font-medium text-gray-700">Success Rate:</span>
            <span class="font-mono">
              {Math.round((loopResults.filter((r) => r.success).length / loopResults.length) * 100)}% ({loopResults.filter(
                (r) => r.success
              ).length}/{loopResults.length})
            </span>
          </div>

          <div class="max-h-64 overflow-y-auto border rounded-md">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50 sticky top-0">
                <tr>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Loop</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each loopResults as result}
                  <tr class="hover:bg-gray-50">
                    <td class="px-3 py-2 text-sm font-mono">{result.loop}</td>
                    <td class="px-3 py-2 text-sm">
                      <span
                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {result.success
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'}"
                      >
                        {result.success ? "✅ Success" : "❌ Failed"}
                      </span>
                    </td>
                    <td class="px-3 py-2 text-xs text-gray-500 font-mono">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </td>
                    <td class="px-3 py-2 text-xs font-mono">
                      {result.result?.executionTime || 0}ms
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Managed Scripts Section -->
  <div class="bg-white shadow rounded-lg mb-6">
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-medium text-gray-900">Managed Scripts</h2>
        <div class="text-sm text-gray-500">Auto-run enabled scripts with scheduling</div>
      </div>
    </div>

    <div class="divide-y divide-gray-200">
      {#if managedScripts.length > 0}
        {#each managedScripts as script}
          <div class="p-6 hover:bg-gray-50">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="text-2xl">
                  {script.autoRun && script.enabled ? "⚡" : script.enabled ? "📜" : "🚫"}
                </div>
                <div class="flex-1">
                  <div class="flex items-center space-x-2">
                    <h3 class="text-sm font-medium text-gray-900">{script.name}</h3>
                    {#if script.autoRun && script.enabled}
                      <span
                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        Auto-run
                      </span>
                    {/if}
                    {#if !script.enabled}
                      <span
                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                      >
                        Disabled
                      </span>
                    {/if}
                  </div>
                  <p class="text-sm text-gray-600">{script.description}</p>
                  <div class="mt-2 flex items-center text-xs text-gray-500 space-x-4">
                    <span>Wait Time: {formatWaitTime(script.waitTime)}</span>
                    <span>Run Count: {script.runCount}</span>
                    {#if script.lastRun}
                      <span>Last Run: {new Date(script.lastRun).toLocaleDateString()}</span>
                    {/if}
                    {#if script.nextRun}
                      <span>Next Run: {formatNextRun(script.nextRun)}</span>
                    {/if}
                  </div>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUpdatingConfig}
                  text="Configure"
                  on:click={() => openConfigModal(script)}
                />
                <Button
                  variant="success"
                  size="sm"
                  disabled={isExecuting || !script.enabled}
                  loading={isExecuting}
                  text={isExecuting ? "Running..." : "Execute"}
                  on:click={() => executeScript(script.name)}
                />
              </div>
            </div>
          </div>
        {/each}
      {:else}
        <div class="text-center py-12">
          <span class="text-4xl mb-4 block">⚡</span>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No managed scripts</h3>
          <p class="text-gray-500">Scripts will appear here after server discovery</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Script Configuration Modal -->
{#if showConfigModal && selectedManagedScript}
  <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">Configure {selectedManagedScript.name}</h3>
      </div>

      <div class="px-6 py-4 space-y-4">
        <!-- Enable/Disable -->
        <div>
          <label class="flex items-center">
            <input
              type="checkbox"
              bind:checked={selectedManagedScript.enabled}
              class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
            <span class="ml-2 text-sm text-gray-700">Enable script</span>
          </label>
        </div>

        <!-- Auto-run -->
        <div>
          <label class="flex items-center">
            <input
              type="checkbox"
              bind:checked={selectedManagedScript.autoRun}
              disabled={!selectedManagedScript.enabled}
              class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:opacity-50"
            />
            <span class="ml-2 text-sm text-gray-700">Enable auto-run</span>
          </label>
        </div>

        <!-- Wait Time -->
        <div>
          <label for="waitTime" class="block text-sm font-medium text-gray-700 mb-1">
            Wait Time Between Runs
          </label>
          <select
            id="waitTime"
            bind:value={selectedManagedScript.waitTime}
            disabled={!selectedManagedScript.enabled || !selectedManagedScript.autoRun}
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
          >
            <option value={60000}>1 minute</option>
            <option value={300000}>5 minutes</option>
            <option value={900000}>15 minutes</option>
            <option value={1800000}>30 minutes</option>
            <option value={3600000}>1 hour</option>
            <option value={7200000}>2 hours</option>
            <option value={21600000}>6 hours</option>
            <option value={43200000}>12 hours</option>
            <option value={86400000}>24 hours</option>
          </select>
        </div>

        <!-- Description -->
        <div>
          <label for="description" class="block text-sm font-medium text-gray-700 mb-1"> Description </label>
          <textarea
            id="description"
            bind:value={selectedManagedScript.description}
            rows="3"
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Script description..."
          ></textarea>
        </div>
      </div>

      <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
        <Button
          variant="outline"
          size="sm"
          disabled={isUpdatingConfig}
          text="Cancel"
          on:click={closeConfigModal}
        />
        <Button
          variant="primary"
          size="sm"
          disabled={isUpdatingConfig}
          loading={isUpdatingConfig}
          text={isUpdatingConfig ? "Saving..." : "Save"}
          on:click={saveScriptConfig}
        />
      </div>
    </div>
  </div>
{/if}
