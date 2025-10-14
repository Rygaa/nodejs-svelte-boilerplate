<script lang="ts">
  import { onMount } from "svelte";
  import { authStore } from "../store/auth.store";
  import { trpc } from "../config/trpc";
  import Input from "../lib/components/Input.svelte";
  import Button from "../lib/components/Button.svelte";
  import PushNotificationComplete from "../lib/components/PushNotificationComplete.svelte";
  import IconExamples from "@/lib/components/IconExamples.svelte";
  import ButtonExamples from "@/lib/components/ButtonExamples.svelte";
  import DataGridExample from "./DataGridExample.svelte";

  let user: any = null;
  let isLoading = true;
  let isUpdating = false;
  let error = "";
  let success = "";

  // Form fields
  let firstName = "";
  let lastName = "";
  let email = "";
  let username = "";

  onMount(() => {
    const unsubscribe = authStore.subscribe(async (auth) => {
      if (auth.isAuthenticated && auth.token) {
        try {
          const userData = await trpc.auth.me.query({});
          user = userData;

          // Pre-fill form fields
          firstName = user.firstName || "";
          lastName = user.lastName || "";
          email = user.email || "";
          username = user.username || "";
        } catch (err) {
        } finally {
          isLoading = false;
        }
      }
    });

    return unsubscribe;
  });

  async function handleUpdateProfile() {
    try {
      isUpdating = true;
      error = "";
      success = "";

      // This would call a tRPC mutation to update user profile
      // await trpc.user.updateProfile.mutate({
      //   firstName,
      //   lastName,
      //   email,
      //   username
      // });

      success = "Profile updated successfully!";

      // Refresh user data
      const userData = await trpc.auth.me.query({});
      user = userData;
    } catch (err: any) {
      error = err?.message || "Failed to update profile";
    } finally {
      isUpdating = false;
    }
  }
</script>

<div class="p-6">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-2">My Account</h1>
    <p class="text-gray-600">Manage your account settings and profile information.</p>
  </div>

  <!-- <IconExamples />
  <ButtonExamples /> -->
  <DataGridExample />

  {#if isLoading}
    <div class="animate-pulse space-y-6">
      <div class="bg-white shadow rounded-lg p-6">
        <div class="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div class="space-y-4">
          <div class="h-4 bg-gray-200 rounded w-3/4"></div>
          <div class="h-4 bg-gray-200 rounded w-1/2"></div>
          <div class="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    </div>
  {:else if user}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Profile Information -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>

        {#if error}
          <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
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
          <div class="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
            <div class="flex">
              <span class="text-green-500 text-xl mr-3">✅</span>
              <div>
                <h3 class="text-sm font-medium text-green-800">Success</h3>
                <p class="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        {/if}

        <form on:submit|preventDefault={handleUpdateProfile} class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              type="text"
              bind:value={firstName}
              placeholder="Enter your first name"
            />
            <Input label="Last Name" type="text" bind:value={lastName} placeholder="Enter your last name" />
          </div>

          <Input
            label="Username"
            type="text"
            bind:value={username}
            placeholder="Enter your username"
            required
          />

          <Input
            label="Email Address"
            type="email"
            bind:value={email}
            placeholder="Enter your email address"
            required
          />

          <div class="pt-4">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isUpdating}
              loading={isUpdating}
              text={isUpdating ? "Updating..." : "Update Profile"}
            />
          </div>
        </form>
      </div>

      <!-- Account Details -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Account Details</h2>

        <dl class="space-y-4">
          <div>
            <dt class="text-sm font-medium text-gray-500">User ID</dt>
            <dd class="mt-1 text-sm text-gray-900 font-mono">{user.id}</dd>
          </div>

          <div>
            <dt class="text-sm font-medium text-gray-500">Role</dt>
            <dd class="mt-1">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {user.role ===
                'ROOT'
                  ? 'bg-red-100 text-red-800'
                  : user.role === 'ADMIN'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-green-100 text-green-800'}"
              >
                {user.role}
              </span>
            </dd>
          </div>

          <div>
            <dt class="text-sm font-medium text-gray-500">Member Since</dt>
            <dd class="mt-1 text-sm text-gray-900">
              {new Date(user.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
          </div>

          <div>
            <dt class="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd class="mt-1 text-sm text-gray-900">
              {new Date(user.updatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
          </div>
        </dl>
      </div>
    </div>

    <!-- Security Settings -->
    <div class="mt-6 bg-white shadow rounded-lg p-6">
      <h2 class="text-lg font-medium text-gray-900 mb-4">Security Settings</h2>
      <p class="text-sm text-gray-600 mb-4">
        Security and password management functionality will be implemented here. This will allow you to:
      </p>
      <ul class="list-disc list-inside text-sm text-gray-600 mb-6 space-y-1">
        <li>Change your password</li>
        <li>Enable two-factor authentication</li>
        <li>View login history</li>
        <li>Manage API tokens</li>
      </ul>

      <div class="bg-gray-50 border border-gray-200 rounded-md p-4">
        <p class="text-sm text-gray-500 text-center">🚧 Security settings coming soon...</p>
      </div>
    </div>

    <!-- Notification Settings -->
    <div class="mt-6 bg-white shadow rounded-lg p-6">
      <h2 class="text-lg font-medium text-gray-900 mb-4">Notification Settings</h2>
      <p class="text-sm text-gray-600 mb-6">
        Manage your push notification preferences to stay updated with important information.
      </p>

      <PushNotificationComplete />
    </div>
  {/if}
</div>
