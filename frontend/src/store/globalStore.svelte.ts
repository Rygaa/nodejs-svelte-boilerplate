// src/stores/appStore.js

class GlobalStore {
  users = $state<any[]>([]);
  user = $state<any>(null);
  authToken = $state<string | null>(null);
  isAuthenticating = $state(true);

  setAuthToken(token: string | null) {
    this.authToken = token;
    if (token === null) {
      localStorage.removeItem("authToken");
    } else {
      localStorage.setItem("authToken", token);
    }
  }

  getAuthToken() {
    if (this.authToken) {
      return this.authToken;
    }
    const tokenFromStorage = localStorage.getItem("authToken");
    if (tokenFromStorage) {
      this.authToken = tokenFromStorage;
      return tokenFromStorage;
    }
    return null;
  }
}

export const _globalStore = new GlobalStore();
