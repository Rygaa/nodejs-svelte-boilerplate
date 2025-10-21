<script lang="ts">
  import { trpc } from "../../config/trpc";
  import { onMount, onDestroy } from "svelte";

  let connected = false;
  let logs: any[] = [];
  let pingData = "";
  let subscriptions: any[] = [];

  // Test ping subscription
  let pingSubscription: any = null;
  let eventSubscription: any = null;
  let logSubscription: any = null;

  function startPingSubscription() {
    if (pingSubscription) return;
    
    connected = true;
    pingSubscription = trpc.ws.ping.subscribe(
      { message: pingData || "Hello from frontend!" },
      {
        onData: (data) => {
          console.log("Received ping response:", data);
          logs = [...logs, {
            type: "ping-response",
            data,
            timestamp: new Date().toISOString(),
          }];
        },
        onError: (error) => {
          console.error("Ping subscription error:", error);
          logs = [...logs, {
            type: "error",
            data: error.message,
            timestamp: new Date().toISOString(),
          }];
        },
      }
    );
  }

  function stopPingSubscription() {
    if (pingSubscription) {
      pingSubscription.unsubscribe();
      pingSubscription = null;
      connected = false;
    }
  }

  function startEventSubscription() {
    if (eventSubscription) return;
    
    eventSubscription = trpc.ws.onEvent.subscribe(
      { eventTypes: ["ping", "pong", "notification", "log"] },
      {
        onData: (event) => {
          console.log("Received event:", event);
          logs = [...logs, {
            type: "event",
            data: event,
            timestamp: new Date().toISOString(),
          }];
        },
        onError: (error) => {
          console.error("Event subscription error:", error);
        },
      }
    );
  }

  function stopEventSubscription() {
    if (eventSubscription) {
      eventSubscription.unsubscribe();
      eventSubscription = null;
    }
  }

  function startLogSubscription() {
    if (logSubscription) return;
    
    logSubscription = trpc.ws.onLogs.subscribe(
      { level: "INFO" },
      {
        onData: (log) => {
          console.log("Received log:", log);
          logs = [...logs, {
            type: "log",
            data: log,
            timestamp: new Date().toISOString(),
          }];
        },
        onError: (error) => {
          console.error("Log subscription error:", error);
        },
      }
    );
  }

  function stopLogSubscription() {
    if (logSubscription) {
      logSubscription.unsubscribe();
      logSubscription = null;
    }
  }

  function clearLogs() {
    logs = [];
  }

  onDestroy(() => {
    // Clean up all subscriptions
    stopPingSubscription();
    stopEventSubscription();
    stopLogSubscription();
  });
</script>

<div class="p-6 max-w-4xl mx-auto">
  <div class="bg-white rounded-lg shadow-md p-6">
    <h2 class="text-2xl font-bold mb-6 text-gray-800">tRPC WebSocket Tester</h2>
    
    <!-- Connection Status -->
    <div class="mb-6 p-4 rounded-lg {connected ? 'bg-green-100 border border-green-300' : 'bg-gray-100 border border-gray-300'}">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold text-gray-700">Connection Status</h3>
          <p class="text-sm text-gray-600">
            Status: <span class="{connected ? 'text-green-600' : 'text-gray-600'}">{connected ? 'Connected' : 'Disconnected'}</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Ping Subscription -->
    <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 class="font-semibold text-gray-700 mb-2">Ping Subscription Test</h3>
      <div class="flex gap-2 mb-2">
        <input 
          type="text" 
          bind:value={pingData} 
          placeholder="Enter ping message"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button 
          on:click={startPingSubscription}
          disabled={!!pingSubscription}
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Ping
        </button>
        <button 
          on:click={stopPingSubscription}
          disabled={!pingSubscription}
          class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Stop Ping
        </button>
      </div>
    </div>

    <!-- Event Subscription -->
    <div class="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
      <h3 class="font-semibold text-gray-700 mb-2">General Event Subscription</h3>
      <div class="flex gap-2">
        <button 
          on:click={startEventSubscription}
          disabled={!!eventSubscription}
          class="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Events
        </button>
        <button 
          on:click={stopEventSubscription}
          disabled={!eventSubscription}
          class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Stop Events
        </button>
      </div>
    </div>

    <!-- Log Subscription -->
    <div class="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
      <h3 class="font-semibold text-gray-700 mb-2">Log Subscription</h3>
      <div class="flex gap-2">
        <button 
          on:click={startLogSubscription}
          disabled={!!logSubscription}
          class="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Logs
        </button>
        <button 
          on:click={stopLogSubscription}
          disabled={!logSubscription}
          class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Stop Logs
        </button>
      </div>
    </div>

    <!-- Logs Display -->
    <div class="mb-4">
      <div class="flex justify-between items-center mb-2">
        <h3 class="font-semibold text-gray-700">Received Messages</h3>
        <button 
          on:click={clearLogs}
          class="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear
        </button>
      </div>
      <div class="bg-gray-900 text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-sm">
        {#each logs as log}
          <div class="mb-2 pb-2 border-b border-gray-700">
            <div class="flex justify-between items-start">
              <span class="text-blue-400">[{log.type}]</span>
              <span class="text-gray-500 text-xs">{new Date(log.timestamp).toLocaleTimeString()}</span>
            </div>
            <pre class="mt-1 whitespace-pre-wrap">{JSON.stringify(log.data, null, 2)}</pre>
          </div>
        {/each}
        {#if logs.length === 0}
          <div class="text-gray-500 italic">No messages received yet...</div>
        {/if}
      </div>
    </div>

    <!-- Connection Info -->
    <div class="mt-4 text-xs text-gray-500 border-t pt-3">
      <p>WebSocket URL: {import.meta.env.VITE_API_URL?.replace('http', 'ws').replace('/trpc', '') || 'ws://localhost:4000'}</p>
      <p>Active Subscriptions: Ping({!!pingSubscription}), Events({!!eventSubscription}), Logs({!!logSubscription})</p>
    </div>
  </div>
</div>