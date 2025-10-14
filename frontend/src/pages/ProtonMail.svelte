<script lang="ts">
  import { onMount } from "svelte";
  import { trpc } from "../config/trpc";

  let isLoading = false;
  let isSaving = false;
  let isTestingConnection = false;
  let error = "";
  let success = "";
  let testResult = "";
  let hasExistingPassword = false; // Track if we have an existing password

  // ProtonMail Bridge configuration
  let protonConfig = {
    host: "127.0.0.1", // Default ProtonMail Bridge host
    port: 1025, // Default ProtonMail Bridge SMTP port
    secure: false, // ProtonMail Bridge uses STARTTLS
    username: "", // ProtonMail email address
    password: "", // ProtonMail Bridge password (not your ProtonMail password)
    fromName: "",
    fromEmail: "",
  };

  let testEmail = {
    to: "",
    subject: "Test Email from AIM Platform",
    body: "This is a test email to verify your ProtonMail configuration is working correctly.",
  };

  async function loadProtonConfig() {
    try {
      isLoading = true;
      error = "";

      const result = await trpc.email.getProtonConfig.query({});
      if (result.config) {
        const { hasPassword, ...configData } = result.config;
        protonConfig = { ...protonConfig, ...configData };

        // If there's an existing password, show placeholder
        if (hasPassword) {
          hasExistingPassword = true;
          protonConfig.password = "••••••••••••••••"; // Show placeholder
        }
      }
    } catch (err: any) {
      error = err?.message || "Failed to load ProtonMail configuration";
    } finally {
      isLoading = false;
    }
  }

  async function saveProtonConfig() {
    try {
      isSaving = true;
      error = "";
      success = "";

      // Prepare config for saving
      const configToSave = { ...protonConfig };

      // If password is the placeholder, don't send it (keep existing password)
      if (hasExistingPassword && protonConfig.password === "••••••••••••••••") {
        delete configToSave.password;
      }

      const result = await trpc.email.saveProtonConfig.mutate({
        config: configToSave,
      });

      success = result.message || "ProtonMail configuration saved successfully";

      // If we saved successfully and had a password, mark as having existing password
      if (configToSave.password) {
        hasExistingPassword = true;
        protonConfig.password = "••••••••••••••••"; // Show placeholder again
      }
    } catch (err: any) {
      error = err?.message || "Failed to save ProtonMail configuration";
    } finally {
      isSaving = false;
    }
  }

  async function testConnection() {
    try {
      isTestingConnection = true;
      testResult = "";
      error = "";

      const result = await trpc.email.testConnection.mutate({});
      testResult = result.message || "Connection test completed";
    } catch (err: any) {
      testResult = err?.message || "Connection test failed";
    } finally {
      isTestingConnection = false;
    }
  }

  async function sendTestEmail() {
    try {
      isTestingConnection = true;
      testResult = "";
      error = "";

      if (!testEmail.to) {
        testResult = "Please enter a recipient email address";
        return;
      }

      const result = await trpc.email.sendTestEmail.mutate({
        to: testEmail.to,
        subject: testEmail.subject,
        body: testEmail.body,
      });

      testResult = result.message || "Test email sent successfully";
    } catch (err: any) {
      testResult = err?.message || "Failed to send test email";
    } finally {
      isTestingConnection = false;
    }
  }

  onMount(() => {
    loadProtonConfig();
  });
</script>

<div class="container mx-auto px-4 py-8 max-w-4xl">
  <div class="flex justify-between items-center mb-8">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">ProtonMail Settings</h1>
      <p class="text-gray-600 mt-2">Configure ProtonMail Bridge to send emails from the platform</p>
    </div>
    <button
      on:click={loadProtonConfig}
      disabled={isLoading}
      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? "Loading..." : "Reload"}
    </button>
  </div>

  {#if error}
    <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Error</h3>
          <p class="mt-1 text-sm text-red-700">{error}</p>
        </div>
      </div>
    </div>
  {/if}

  {#if success}
    <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-green-800">Success</h3>
          <p class="mt-1 text-sm text-green-700">{success}</p>
        </div>
      </div>
    </div>
  {/if}

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- Configuration Form -->
    <div class="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <svg class="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          ></path>
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          ></path>
        </svg>
        ProtonMail Bridge Configuration
      </h2>

      <form on:submit|preventDefault={saveProtonConfig} class="space-y-4">
        <!-- SMTP Settings -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="host" class="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
            <input
              id="host"
              type="text"
              bind:value={protonConfig.host}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="127.0.0.1"
              required
            />
          </div>
          <div>
            <label for="port" class="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
            <input
              id="port"
              type="number"
              bind:value={protonConfig.port}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1025"
              required
            />
          </div>
        </div>

        <!-- Authentication -->
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700 mb-1">ProtonMail Email</label>
          <input
            id="username"
            type="email"
            bind:value={protonConfig.username}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="your-email@protonmail.com"
            required
          />
          <p class="text-xs text-gray-500 mt-1">Your ProtonMail email address</p>
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Bridge Password</label>
          <input
            id="password"
            type="password"
            bind:value={protonConfig.password}
            on:focus={() => {
              if (hasExistingPassword && protonConfig.password === "••••••••••••••••") {
                protonConfig.password = "";
              }
            }}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={hasExistingPassword ? "Enter new password to change" : "Bridge generated password"}
            required
          />
          <p class="text-xs text-gray-500 mt-1">
            {hasExistingPassword
              ? "Password is saved. Enter a new password only if you want to change it."
              : "Generated password from ProtonMail Bridge (not your login password)"}
          </p>
        </div>

        <!-- Sender Information -->
        <div>
          <label for="fromName" class="block text-sm font-medium text-gray-700 mb-1">From Name</label>
          <input
            id="fromName"
            type="text"
            bind:value={protonConfig.fromName}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="AIM Platform"
            required
          />
        </div>

        <div>
          <label for="fromEmail" class="block text-sm font-medium text-gray-700 mb-1">From Email</label>
          <input
            id="fromEmail"
            type="email"
            bind:value={protonConfig.fromEmail}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="noreply@yourcompany.com"
            required
          />
        </div>

        <!-- Security Setting -->
        <div class="flex items-center">
          <input
            id="secure"
            type="checkbox"
            bind:checked={protonConfig.secure}
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label for="secure" class="ml-2 block text-sm text-gray-700">
            Use SSL/TLS (usually disabled for ProtonMail Bridge)
          </label>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? "Saving..." : "Save Configuration"}
        </button>
      </form>
    </div>

    <!-- Testing Panel -->
    <div class="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <svg class="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        Test Configuration
      </h2>

      <!-- Connection Test -->
      <div class="mb-6">
        <h3 class="text-lg font-medium text-gray-800 mb-3">Connection Test</h3>
        <button
          on:click={testConnection}
          disabled={isTestingConnection}
          class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isTestingConnection ? "Testing..." : "Test SMTP Connection"}
        </button>
      </div>

      <!-- Test Email -->
      <div class="mb-6">
        <h3 class="text-lg font-medium text-gray-800 mb-3">Send Test Email</h3>
        <form on:submit|preventDefault={sendTestEmail} class="space-y-3">
          <div>
            <label for="testTo" class="block text-sm font-medium text-gray-700 mb-1">Recipient Email</label>
            <input
              id="testTo"
              type="email"
              bind:value={testEmail.to}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="test@example.com"
              required
            />
          </div>
          <div>
            <label for="testSubject" class="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              id="testSubject"
              type="text"
              bind:value={testEmail.subject}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label for="testBody" class="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              id="testBody"
              bind:value={testEmail.body}
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            ></textarea>
          </div>
          <button
            type="submit"
            disabled={isTestingConnection}
            class="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTestingConnection ? "Sending..." : "Send Test Email"}
          </button>
        </form>
      </div>

      <!-- Test Results -->
      {#if testResult}
        <div class="p-3 bg-gray-50 border border-gray-200 rounded-md">
          <h4 class="text-sm font-medium text-gray-700 mb-2">Test Result:</h4>
          <p class="text-sm text-gray-600">{testResult}</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- ProtonMail Bridge Instructions -->
  <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
    <h3 class="text-lg font-semibold text-blue-900 mb-4 flex items-center">
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        ></path>
      </svg>
      ProtonMail Bridge Setup Instructions
    </h3>
    <div class="text-sm text-blue-800 space-y-2">
      <p><strong>1.</strong> Make sure ProtonMail Bridge is running on your system</p>
      <p><strong>2.</strong> Default SMTP settings: Host 127.0.0.1, Port 1025, Security: STARTTLS</p>
      <p><strong>3.</strong> Use your ProtonMail email as username</p>
      <p>
        <strong>4.</strong> Use the Bridge-generated password (found in Bridge settings, not your ProtonMail password)
      </p>
      <p><strong>5.</strong> Test the connection before saving to ensure everything works correctly</p>
    </div>
  </div>
</div>
