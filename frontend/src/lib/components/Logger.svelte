<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { trpc } from "../../config/trpc";
  import Button from "./Button.svelte";

  interface LogEntry {
    id?: string; // Unique identifier for the log entry
    timestamp: string;
    level: string;
    message: string;
    data: any;
    icon: string;
    color: string;
    source?: string; // Source file for the log
  }

  interface LogTab {
    id: string;
    name: string;
    logs: LogEntry[];
    unreadCount: number;
  }

  let isVisible = false;
  let logTabs: LogTab[] = [];
  let activeTabId = "all";
  let logSubscription: any = null;
  let autoScroll = true;
  let logContainer: HTMLElement;
  let logLevel = "INFO"; // Filter level
  let expandedLogs = new Set(); // Track which logs are expanded
  let isUserScrolledUp = false; // Track if user manually scrolled up

  const logLevels = ["DEBUG", "INFO", "PROCESS", "API", "DATA", "SUCCESS", "WARNING", "ERROR"];

  onMount(() => {
    // Initialize with "All" tab
    logTabs = [
      {
        id: "all",
        name: "All",
        logs: [],
        unreadCount: 0,
      },
    ];

    // Connect to tRPC WebSocket subscription for logs
    try {
      addLocalLog("INFO", "Connecting to real-time console...", null);
      
      logSubscription = trpc.ws.onLogs.subscribe(
        { level: logLevel },
        {
          onData: (logEntry: LogEntry) => {
            addLog(logEntry);
          },
          onError: (error) => {
            addLocalLog("ERROR", "Real-time console error", error.message);
          },
        }
      );
      
      addLocalLog("SUCCESS", "Connected to real-time console", null);
    } catch (error) {
      addLocalLog("ERROR", "Failed to connect to real-time console", error.message);
    }

    // Listen for keyboard shortcuts
    const handleKeyboard = (event: KeyboardEvent) => {
      // Ctrl/Cmd + ` to toggle console
      if ((event.ctrlKey || event.metaKey) && event.key === "`") {
        event.preventDefault();
        toggleConsole();
      }
      // Escape to close console
      if (event.key === "Escape" && isVisible) {
        closeConsole();
      }
    };

    document.addEventListener("keydown", handleKeyboard);

    return () => {
      document.removeEventListener("keydown", handleKeyboard);
    };
  });

  onDestroy(() => {
    if (logSubscription) {
      logSubscription.unsubscribe();
    }
  });

  function addLog(logEntry: LogEntry) {
    // Add unique ID if not provided
    if (!logEntry.id) {
      logEntry.id = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Add to "All" tab
    const allTab = logTabs.find((tab) => tab.id === "all");
    if (allTab) {
      allTab.logs = [...allTab.logs, logEntry];
      // Keep only last 500 logs per tab
      if (allTab.logs.length > 500) {
        allTab.logs = allTab.logs.slice(-500);
      }
      // Update unread count if not viewing this tab
      if (activeTabId !== "all") {
        allTab.unreadCount++;
      }
    }

    // Add to source-specific tab if source is provided by backend
    if (logEntry.source) {
      let sourceTab = logTabs.find((tab) => tab.id === logEntry.source);

      if (!sourceTab) {
        // Create new tab for this source
        sourceTab = {
          id: logEntry.source,
          name: logEntry.source,
          logs: [],
          unreadCount: 0,
        };
        logTabs = [...logTabs, sourceTab];
      }

      sourceTab.logs = [...sourceTab.logs, logEntry];
      // Keep only last 500 logs per tab
      if (sourceTab.logs.length > 500) {
        sourceTab.logs = sourceTab.logs.slice(-500);
      }
      // Update unread count if not viewing this tab
      if (activeTabId !== sourceTab.id) {
        sourceTab.unreadCount++;
      }
    }

    logTabs = [...logTabs]; // Trigger reactivity

    // Auto-scroll to bottom only if enabled AND user hasn't scrolled up
    if (autoScroll && !isUserScrolledUp && logContainer) {
      setTimeout(() => {
        logContainer.scrollTop = logContainer.scrollHeight;
      }, 10);
    }
  }

  function addLocalLog(level: string, message: string, data: any) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      icon: getIconForLevel(level),
      color: getColorForLevel(level),
    };
    addLog(logEntry);
  }

  function getIconForLevel(level: string): string {
    const icons: Record<string, string> = {
      INFO: "ℹ️",
      SUCCESS: "✅",
      WARNING: "⚠️",
      ERROR: "❌",
      DEBUG: "🔍",
      PROCESS: "⚙️",
      API: "🌐",
      DATA: "📊",
    };
    return icons[level] || "📝";
  }

  function getColorForLevel(level: string): string {
    const colors: Record<string, string> = {
      INFO: "#2196F3",
      SUCCESS: "#4CAF50",
      WARNING: "#FF9800",
      ERROR: "#F44336",
      DEBUG: "#9E9E9E",
      PROCESS: "#607D8B",
      API: "#FF5722",
      DATA: "#3F51B5",
    };
    return colors[level] || "#000000";
  }

  function toggleConsole() {
    isVisible = !isVisible;
  }

  function closeConsole() {
    isVisible = false;
  }

  function clearLogs() {
    // Clear all tabs
    logTabs = logTabs.map((tab) => ({
      ...tab,
      logs: [],
      unreadCount: 0,
    }));
  }

  function clearCurrentTab() {
    const activeTab = logTabs.find((tab) => tab.id === activeTabId);
    if (activeTab) {
      activeTab.logs = [];
      activeTab.unreadCount = 0;
      logTabs = [...logTabs];
    }
  }

  function switchTab(tabId: string) {
    activeTabId = tabId;
    // Reset unread count for the selected tab
    const tab = logTabs.find((t) => t.id === tabId);
    if (tab) {
      tab.unreadCount = 0;
      logTabs = [...logTabs];
    }

    // Auto-scroll to bottom when switching tabs (always scroll on tab switch)
    if (autoScroll && logContainer) {
      setTimeout(() => {
        logContainer.scrollTop = logContainer.scrollHeight;
        isUserScrolledUp = false; // Reset scroll state when switching tabs
      }, 10);
    }
  }

  function closeTab(tabId: string) {
    if (tabId === "all") return; // Can't close "All" tab

    logTabs = logTabs.filter((tab) => tab.id !== tabId);

    // Switch to "All" tab if closing the active tab
    if (activeTabId === tabId) {
      activeTabId = "all";
    }
  }

  function toggleAutoScroll() {
    autoScroll = !autoScroll;
  }

  function isScrolledToBottom(element: HTMLElement): boolean {
    const threshold = 50; // Allow 50px threshold for "bottom"
    return element.scrollTop >= element.scrollHeight - element.clientHeight - threshold;
  }

  function handleScroll() {
    if (logContainer) {
      isUserScrolledUp = !isScrolledToBottom(logContainer);
      // If user scrolled to bottom manually, re-enable auto-scroll
      if (!isUserScrolledUp && !autoScroll) {
        autoScroll = true;
      }
    }
  }

  function scrollToBottom() {
    if (logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight;
      isUserScrolledUp = false;
      autoScroll = true;
    }
  }

  function toggleLogExpanded(logId: string) {
    if (expandedLogs.has(logId)) {
      expandedLogs.delete(logId);
    } else {
      expandedLogs.add(logId);
    }
    expandedLogs = expandedLogs; // Trigger reactivity
  }

  function hasData(log: LogEntry): boolean {
    return log.data && typeof log.data === "object" && Object.keys(log.data).length > 0;
  }

  function shouldShowLog(log: LogEntry): boolean {
    const levelIndex = logLevels.indexOf(log.level);
    const filterIndex = logLevels.indexOf(logLevel);
    return levelIndex >= filterIndex;
  }

  $: activeTab = logTabs.find((tab) => tab.id === activeTabId);
  $: filteredLogs = activeTab ? activeTab.logs.filter(shouldShowLog) : [];
  $: totalLogs = logTabs.reduce((sum, tab) => sum + tab.logs.length, 0);
</script>

<!-- Console Toggle Button -->
<div class="fixed bottom-4 right-4 z-50">
  <Button
    variant="secondary"
    iconOnly={true}
    size="md"
    rounded="full"
    tooltip="Toggle Real-time Console (Ctrl/Cmd + `)"
    on:click={toggleConsole}
  >
    <svg slot="iconLeft" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width={2}
        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  </Button>
</div>

<!-- Console Window -->
{#if isVisible}
  <div class="fixed bottom-0 right-4 left-4 z-40 p-4 pointer-events-none">
    <!-- Console Panel -->
    <div
      class="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-4xl h-96 flex flex-col ml-auto pointer-events-auto relative"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-3 border-b border-gray-700">
        <div class="flex items-center space-x-4">
          <h3 class="text-white font-medium">Real-time Console</h3>
          <div class="flex items-center space-x-2">
            <span class="text-gray-400 text-sm">Filter:</span>
            <select
              bind:value={logLevel}
              class="bg-gray-800 text-white text-sm border border-gray-600 rounded px-2 py-1"
            >
              {#each logLevels as level}
                <option value={level}>{level}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <Button
            variant={autoScroll && !isUserScrolledUp ? "primary" : "secondary"}
            size="xs"
            text={autoScroll && !isUserScrolledUp ? "Auto-scroll ON" : "Auto-scroll OFF"}
            tooltip="Toggle auto-scroll behavior"
            on:click={toggleAutoScroll}
          />
          <Button
            variant="secondary"
            size="xs"
            text="Clear Tab"
            tooltip="Clear current tab logs"
            on:click={clearCurrentTab}
          />
          <Button
            variant="secondary"
            size="xs"
            text="Clear All"
            tooltip="Clear all logs"
            on:click={clearLogs}
          />
          <Button
            variant="ghost"
            iconOnly={true}
            size="xs"
            tooltip="Close console (Esc)"
            on:click={closeConsole}
          >
            <svg slot="iconLeft" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex items-center space-x-1 px-3 py-2 border-b border-gray-700 bg-gray-800 overflow-x-auto">
        {#each logTabs as tab}
          <button
            class="relative flex items-center space-x-2 px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap {activeTabId ===
            tab.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
            on:click={() => switchTab(tab.id)}
          >
            <span>{tab.name}</span>
            {#if tab.unreadCount > 0}
              <span
                class="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center"
              >
                {tab.unreadCount}
              </span>
            {/if}
            {#if tab.id !== "all"}
              <button
                class="ml-1 text-gray-400 hover:text-white"
                on:click|stopPropagation={() => closeTab(tab.id)}
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            {/if}
          </button>
        {/each}
      </div>

      <!-- Log Content -->
      <div
        bind:this={logContainer}
        class="flex-1 overflow-y-auto p-3 bg-black text-green-400 font-mono text-sm"
        on:scroll={handleScroll}
      >
        {#each filteredLogs as log, index}
          {@const logId = log.id || `${log.timestamp}-${index}`}
          <div class="flex items-start space-x-2 mb-1 hover:bg-gray-900 px-1 rounded">
            <span class="flex-shrink-0 text-lg">{log.icon}</span>
            <span class="flex-shrink-0 text-gray-500 w-20"
              >{new Date(log.timestamp).toLocaleTimeString()}</span
            >
            <span class="flex-shrink-0 font-bold w-16" style="color: {log.color}">
              {log.level}
            </span>
            {#if hasData(log)}
              <button
                type="button"
                class="text-green-400 flex-1 cursor-pointer hover:text-green-300 text-left bg-transparent border-none p-0 font-mono"
                on:click={() => toggleLogExpanded(logId)}
              >
                {log.message}
              </button>
            {:else}
              <span class="text-green-400 flex-1">
                {log.message}
              </span>
            {/if}
            {#if log.source}
              <span class="flex-shrink-0 text-gray-400 text-xs px-2 py-0.5 bg-gray-800 rounded">
                {log.source}
              </span>
            {/if}
          </div>
          {#if hasData(log) && expandedLogs.has(logId)}
            <div class="ml-8 mb-2 text-gray-400 text-xs">
              <pre class="whitespace-pre-wrap break-all ml-4 bg-gray-900 p-2 rounded">{JSON.stringify(
                  log.data,
                  null,
                  2
                )}</pre>
            </div>
          {/if}
        {/each}

        {#if filteredLogs.length === 0}
          <div class="text-gray-500 text-center py-8">No logs to display. Waiting for real-time logs...</div>
        {/if}
      </div>

      <!-- Scroll to Bottom Button -->
      {#if isUserScrolledUp}
        <div class="absolute bottom-16 right-4 z-10">
          <Button
            variant="primary"
            size="sm"
            text="Scroll to Bottom"
            tooltip="Scroll to bottom and resume auto-scroll"
            on:click={scrollToBottom}
          >
            <svg slot="iconLeft" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </Button>
        </div>
      {/if}

      <!-- Footer -->
      <div class="flex items-center justify-between p-2 border-t border-gray-700 text-xs text-gray-400">
        <div>
          Connected to: {backendUrl} | Tab: {activeTab?.name || "None"} | Total logs: {totalLogs} | Filtered: {filteredLogs.length}
        </div>
        <div>Press Ctrl/Cmd + ` to toggle | Esc to close</div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Custom scrollbar for the log container */
  :global(.console-logs::-webkit-scrollbar) {
    width: 8px;
  }

  :global(.console-logs::-webkit-scrollbar-track) {
    background: #1f2937;
  }

  :global(.console-logs::-webkit-scrollbar-thumb) {
    background: #4b5563;
    border-radius: 4px;
  }

  :global(.console-logs::-webkit-scrollbar-thumb:hover) {
    background: #6b7280;
  }
</style>
