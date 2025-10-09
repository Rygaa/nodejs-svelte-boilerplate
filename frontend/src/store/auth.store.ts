import { writable } from "svelte/store";

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  role: "USER" | "ADMIN" | "ROOT";
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoggedIn: boolean;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem("auth-token"),
  isAuthenticated: false,
  isLoggedIn: false,
  isLoading: false,
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,
    login: (user: User, token: string) => {
      localStorage.setItem("auth-token", token);
      set({
        user,
        token,
        isAuthenticated: true,
        isLoggedIn: true,
        isLoading: false,
      });
    },
    logout: () => {
      localStorage.removeItem("auth-token");
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoggedIn: false,
        isLoading: false,
      });
    },
    setLoading: (isLoading: boolean) => {
      update((state) => ({ ...state, isLoading }));
    },
    setUser: (user: User) => {
      update((state) => ({ ...state, user, isAuthenticated: true }));
    },
    initializeFromStorage: () => {
      const token = localStorage.getItem("auth-token");
      if (token) {
        update((state) => ({
          ...state,
          token,
          isAuthenticated: true,
          isLoggedIn: true,
        }));
      }
    },
  };
}

export const authStore = createAuthStore();
