/// &lt;reference types="svelte" /&gt;
/// &lt;reference types="vite/client" /&gt;

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_BACKEND_URL: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
