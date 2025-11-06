<script lang="ts">
  import { _globalStore } from "../store/globalStore.svelte";
  import { navigate } from "svelte-routing";
  import Button from "../lib/components/Button.svelte";
  import Input from "../lib/components/Input.svelte";
  import { trpc } from "../lib/trpc";

  let amount = $state(2500); // Amount in DZD
  let loading = $state(false);
  let error = $state<string | null>(null);

  // Password update states
  let showPasswordForm = $state(false);
  let oldPassword = $state("");
  let newPassword = $state("");
  let confirmNewPassword = $state("");
  let passwordLoading = $state(false);
  let passwordError = $state<string | null>(null);
  let passwordSuccess = $state<string | null>(null);

  // Handle payment checkout
  async function handleCheckout() {
    loading = true;
    error = null;

    const result = await trpc.createCheckout.mutate({
      amount,
      currency: "dzd",
    });

    if (result.success && result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
    }

    loading = false;
  }

  // Handle password update
  async function handlePasswordUpdate() {
    if (!_globalStore.user) return;

    passwordError = null;
    passwordSuccess = null;
    passwordLoading = true;

    const result = await trpc.updateMyPassword.mutate({
      id: _globalStore.user.id,
      oldPassword,
      newPassword,
      confirmNewPassword,
    });

    if (result.success) {
      passwordSuccess = "Password updated successfully!";
      // Reset form
      oldPassword = "";
      newPassword = "";
      confirmNewPassword = "";
      showPasswordForm = false;
    } else {
      passwordError = result.message || "Failed to update password";
    }

    passwordLoading = false;
  }

  function resetPasswordForm() {
    oldPassword = "";
    newPassword = "";
    confirmNewPassword = "";
    passwordError = null;
    passwordSuccess = null;
    showPasswordForm = false;
  }

  // Calculate subscription status
  let subscriptionStatus = $derived.by(() => {
    if (!_globalStore.user?.subscriptionEndDate) {
      return { active: false, message: "No active subscription" };
    }

    const endDate = new Date(_globalStore.user.subscriptionEndDate);
    const now = new Date();

    if (endDate > now) {
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        active: true,
        message: "Active subscription",
        endDate: endDate.toLocaleDateString(),
        daysRemaining,
      };
    } else {
      return { active: false, message: "Subscription expired", endDate: endDate.toLocaleDateString() };
    }
  });
</script>

<div class="min-h-screen bg-gray-50 p-8">
  <div class="max-w-full overflow-hidden">
    <div class="bg-white rounded-lg shadow-lg p-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-6">Profile</h1>

      {#if _globalStore.user}
        <div class="space-y-6">
          <!-- Subscription Status Section -->
          <div class="border-b border-gray-200 pb-4">
            <h2 class="text-lg font-semibold text-gray-700 mb-3">Subscription Status</h2>
            <div
              class="p-4 rounded-lg {subscriptionStatus.active
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'}"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p
                    class="text-base font-semibold {subscriptionStatus.active
                      ? 'text-green-800'
                      : 'text-red-800'}"
                  >
                    {subscriptionStatus.message}
                  </p>
                  {#if subscriptionStatus.endDate}
                    <p class="text-sm text-gray-600 mt-1">
                      {subscriptionStatus.active ? "Valid until" : "Expired on"}:
                      {subscriptionStatus.endDate}
                    </p>
                    {#if subscriptionStatus.active && subscriptionStatus.daysRemaining}
                      <p class="text-sm text-gray-600">
                        {subscriptionStatus.daysRemaining} days remaining
                      </p>
                    {/if}
                  {/if}
                </div>
                {#if subscriptionStatus.active}
                  <svg class="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"
                    />
                  </svg>
                {:else}
                  <svg class="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clip-rule="evenodd"
                    />
                  </svg>
                {/if}
              </div>
            </div>
          </div>

          <!-- Payment Section -->
          {#if !subscriptionStatus.active}
            <div class="border-b border-gray-200 pb-4">
              <h2 class="text-lg font-semibold text-gray-700 mb-3">Subscribe to Access Content</h2>
              {#if error}
                <div class="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              {/if}

              <Button onclick={handleCheckout} disabled={loading || amount < 100} fullWidth={true}>
                {loading ? "Processing..." : `Pay ${amount} DZD`}
              </Button>
            </div>
          {/if}

          <!-- User Information Section -->
          <div class="border-b border-gray-200 pb-4">
            <h2 class="text-lg font-semibold text-gray-700 mb-2">User Information</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-600">Email</p>
                <p class="text-base font-medium text-gray-900">{_globalStore.user.email}</p>
              </div>
              {#if _globalStore.user.username}
                <div>
                  <p class="text-sm text-gray-600">Username</p>
                  <p class="text-base font-medium text-gray-900">{_globalStore.user.username}</p>
                </div>
              {/if}
              {#if _globalStore.user.firstName}
                <div>
                  <p class="text-sm text-gray-600">First Name</p>
                  <p class="text-base font-medium text-gray-900">{_globalStore.user.firstName}</p>
                </div>
              {/if}
              {#if _globalStore.user.lastName}
                <div>
                  <p class="text-sm text-gray-600">Last Name</p>
                  <p class="text-base font-medium text-gray-900">{_globalStore.user.lastName}</p>
                </div>
              {/if}
              <div>
                <p class="text-sm text-gray-600">Role</p>
                <p class="text-base font-medium text-gray-900">{_globalStore.user.role}</p>
              </div>
            </div>
          </div>

          <!-- Password Update Section -->
          <div class="border-b border-gray-200 pb-4">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-lg font-semibold text-gray-700">Security</h2>
              {#if !showPasswordForm}
                <Button
                  onclick={() => {
                    showPasswordForm = true;
                  }}
                  variant="secondary"
                  size="sm"
                >
                  Change Password
                </Button>
              {/if}
            </div>

            {#if passwordSuccess}
              <div
                class="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm"
              >
                {passwordSuccess}
              </div>
            {/if}

            {#if showPasswordForm}
              <div class="bg-gray-50 p-4 rounded-lg">
                <h3 class="text-base font-medium text-gray-900 mb-4">Update Password</h3>

                {#if passwordError}
                  <div class="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                    {passwordError}
                  </div>
                {/if}

                <div class="space-y-4">
                  <Input
                    label="Current Password"
                    type="password"
                    bind:value={oldPassword}
                    placeholder="Enter current password"
                    required
                  />

                  <Input
                    label="New Password"
                    type="password"
                    bind:value={newPassword}
                    placeholder="Enter new password (min 8 characters)"
                    required
                  />

                  <Input
                    label="Confirm New Password"
                    type="password"
                    bind:value={confirmNewPassword}
                    placeholder="Confirm new password"
                    required
                  />

                  <div class="flex gap-3 pt-2">
                    <Button
                      onclick={handlePasswordUpdate}
                      disabled={passwordLoading || !oldPassword || !newPassword || !confirmNewPassword}
                    >
                      {passwordLoading ? "Updating..." : "Update Password"}
                    </Button>
                    <Button onclick={resetPasswordForm} variant="secondary">Cancel</Button>
                  </div>
                </div>
              </div>
            {/if}
          </div>

          <div>
            <p class="text-sm text-gray-600">Account Created</p>
            <p class="text-base font-medium text-gray-900">
              {new Date(_globalStore.user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      {:else}
        <p class="text-gray-600">No user data available</p>
      {/if}
    </div>
  </div>
</div>
