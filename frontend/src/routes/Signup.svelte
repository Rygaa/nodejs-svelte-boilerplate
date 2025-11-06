<script lang="ts">
  import Button from "../lib/components/Button.svelte";
  import Input from "../lib/components/Input.svelte";
  import { navigate } from "svelte-routing";
  import { trpc } from "../lib/trpc";
  import { _globalStore } from "../store/globalStore.svelte";

  let email = $state("");
  let password = $state("");
  let confirmPassword = $state("");

  let emailError = $state("");
  let passwordError = $state("");
  let confirmPasswordError = $state("");
  let generalError = $state("");

  let isSubmitting = $state(false);

  async function handleSubmit() {
    isSubmitting = true;
    generalError = "";
    emailError = "";

    const result = await trpc.signup.mutate({
      email,
      password,
    });

    if (result.success) {
      _globalStore.setAuthToken(result.authToken);
      _globalStore.user = result.user;
      navigate("/profile", { replace: true });
    } else {
      generalError = result.message ?? "Signup failed";
    }

    isSubmitting = false;
  }
</script>

<div
  class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 w-full"
>
  <div class="w-full max-w-md">
    <div class="bg-white rounded-lg shadow-xl overflow-hidden">
      <div class="px-6 py-8 sm:px-8 sm:py-10">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 text-center mb-2">Create Account</h1>
          <p class="text-sm text-gray-600 text-center">Sign up to get started</p>
        </div>

        <div class="space-y-6">
          {#if generalError}
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
              <p class="text-sm text-red-800">{generalError}</p>
            </div>
          {/if}

          <div class="space-y-4">
            <Input
              label="Email"
              type="text"
              bind:value={email}
              placeholder="you@example.com"
              error={emailError}
              autocomplete="email"
            />

            <Input
              label="Password"
              type="password"
              bind:value={password}
              placeholder="Enter your password"
              error={passwordError}
              autocomplete="new-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              bind:value={confirmPassword}
              placeholder="Confirm your password"
              error={confirmPasswordError}
              autocomplete="new-password"
            />
          </div>

          <div class="pt-4">
            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth={true}
              text="Create Account"
              loading={isSubmitting}
              disabled={isSubmitting}
              onclick={handleSubmit}
            />
          </div>
        </div>

        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">
            Already have an account?
            <a href="/login" class="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
