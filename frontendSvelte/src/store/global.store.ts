// src/stores/appStore.js
import { writable, get } from "svelte/store";

function createAppStore() {
  const { subscribe, set, update } = writable({
    users: [],
    companies: [],
  });

  return {
    subscribe,

    // Replace the whole state
    set,

    // --- Setters for slices ---
    setUsers: (users: any) => update((state) => ({ ...state, users })),

    setCompanies: (companies: any) => update((state) => ({ ...state, companies })),

    // --- Getters ---
    getState: () => get({ subscribe }),
  };
}

export const appStore = createAppStore();
