<script lang="ts">
  import { onMount } from 'svelte';
  
  let reason = $state('Your session was disconnected');
  
  onMount(() => {
    // Clear auth token
    localStorage.removeItem('authToken');
    
    // Get reason from URL params if available
    const params = new URLSearchParams(window.location.search);
    const urlReason = params.get('reason');
    if (urlReason) {
      reason = urlReason;
    }
  });
  
  function goToLogin() {
    window.location.href = '/login';
  }
</script>

<div class="error-container">
  <div class="error-card">
    <div class="error-icon">⚠️</div>
    <h1 class="error-title">Connection Error</h1>
    <p class="error-message">{reason}</p>
    <p class="error-description">
      Your account was accessed from a different location. For security reasons, 
      your previous session has been terminated.
    </p>
    <button class="login-button" onclick={goToLogin}>
      Return to Login
    </button>
  </div>
</div>

<style>
  .error-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 1rem;
  }

  .error-card {
    background: white;
    border-radius: 1rem;
    padding: 3rem 2rem;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    text-align: center;
  }

  .error-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .error-title {
    font-size: 2rem;
    font-weight: bold;
    color: #1f2937;
    margin-bottom: 1rem;
  }

  .error-message {
    font-size: 1.125rem;
    color: #dc2626;
    margin-bottom: 1rem;
    font-weight: 500;
  }

  .error-description {
    color: #6b7280;
    line-height: 1.6;
    margin-bottom: 2rem;
  }

  .login-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 0.75rem 2rem;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .login-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
  }

  .login-button:active {
    transform: translateY(0);
  }
</style>
