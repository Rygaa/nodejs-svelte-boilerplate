<script lang="ts">
  import { authStore } from "../store/auth.store";
  import { trpc } from "../config/trpc";
  import { push } from "svelte-spa-router";
  import Input from "../lib/components/Input.svelte";
  import Button from "../lib/components/Button.svelte";

  let email = "";
  let username = "";
  let password = "";
  let confirmPassword = "";
  let errors: Record<string, string> = {};
  let isLoading = false;

  function validateForm() {
    errors = {};

    if (!email) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Invalid email format";

    if (!username) errors.username = "Username is required";
    else if (username.length < 3) errors.username = "Username must be at least 3 characters";
    else if (username.length > 20) errors.username = "Username must be less than 20 characters";

    if (!password) errors.password = "Password is required";
    else if (password.length < 6) errors.password = "Password must be at least 6 characters";

    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";

    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();

    if (!validateForm()) return;

    isLoading = true;
    authStore.setLoading(true);

    try {
      const result = await trpc.auth.signup.mutate({
        email,
        username,
        password,
      });

      authStore.login(result.user, result.token);
      push("/dashboard");
    } catch (error: any) {
      if (error.message?.includes("Email already exists")) {
        errors.email = "Email already exists";
      } else if (error.message?.includes("Username already exists")) {
        errors.username = "Username already exists";
      } else {
        errors.general = error.message || "Signup failed. Please try again.";
      }
    } finally {
      isLoading = false;
      authStore.setLoading(false);
    }
  }
</script>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
    <p class="mt-2 text-center text-sm text-gray-600">
      Or
      <Button
        variant="ghost"
        text="sign in to your existing account"
        size="sm"
        on:click={() => push("/login")}
      />
    </p>
  </div>

  <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      <form class="space-y-6" on:submit={handleSubmit} novalidate>
        {#if errors.general}
          <div class="rounded-md bg-red-50 p-4">
            <div class="text-sm text-red-700">{errors.general}</div>
          </div>
        {/if}

        <Input
          label="Email Address"
          id="email"
          name="email"
          type="email"
          required={true}
          bind:value={email}
          placeholder="you@example.com"
          error={errors.email}
        />

        <Input
          label="Username"
          id="username"
          name="username"
          type="text"
          required={true}
          bind:value={username}
          placeholder="johndoe"
          error={errors.username}
        />

        <Input
          label="Password"
          id="password"
          name="password"
          type="password"
          required={true}
          bind:value={password}
          error={errors.password}
        />

        <Input
          label="Confirm Password"
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required={true}
          bind:value={confirmPassword}
          error={errors.confirmPassword}
        />

        <div>
          <Button
            type="submit"
            variant="primary"
            text={isLoading ? "Creating Account..." : "Create Account"}
            disabled={isLoading}
            loading={isLoading}
            fullWidth={true}
          />
        </div>
      </form>
    </div>
  </div>
</div>
