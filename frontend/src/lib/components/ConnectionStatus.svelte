<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getConnectionStatus } from '../trpc';

  let status = $state({
    status: 'disconnected' as 'connected' | 'disconnected' | 'error',
    lastHeartbeat: Date.now(),
    timeSinceLastHeartbeat: 0,
  });

  let intervalId: number | null = null;

  onMount(() => {
    // Update status every second
    intervalId = window.setInterval(() => {
      status = getConnectionStatus();
    }, 1000);
  });

  onDestroy(() => {
    if (intervalId) {
      window.clearInterval(intervalId);
    }
  });

  $effect(() => {
    console.log('Connection status:', status);
  });
</script>

<div class="connection-status" class:connected={status.status === 'connected'} class:error={status.status === 'error'}>
  <span class="status-indicator"></span>
  <span class="status-text">
    {#if status.status === 'connected'}
      Connected
    {:else if status.status === 'error'}
      Error
    {:else}
      Disconnected
    {/if}
  </span>
  {#if status.status === 'connected'}
    <span class="heartbeat-time">
      Last heartbeat: {Math.floor(status.timeSinceLastHeartbeat / 1000)}s ago
    </span>
  {/if}
</div>

<style>
  .connection-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    background-color: #f3f4f6;
    font-size: 0.875rem;
  }

  .connection-status.connected {
    background-color: #d1fae5;
    color: #065f46;
  }

  .connection-status.error {
    background-color: #fee2e2;
    color: #991b1b;
  }

  .status-indicator {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background-color: #9ca3af;
  }

  .connected .status-indicator {
    background-color: #10b981;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .error .status-indicator {
    background-color: #ef4444;
  }

  .heartbeat-time {
    font-size: 0.75rem;
    opacity: 0.7;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style>
