import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

// “polyfill” __dirname in ESM:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        // These must match your tsconfig “paths” settings
        "@api": path.resolve(__dirname, "src/api"),
        "@types": path.resolve(__dirname, "src/types"),
        "@context": path.resolve(__dirname, "src/context"),
      },
    },
    define: {
      API_BASE_URL: JSON.stringify(env.API_BASE_URL),
      OAUTH_CLIENT_ID: JSON.stringify(env.OAUTH_CLIENT_ID),
      GIT_URL: JSON.stringify(env.GIT_URL),
    },
  };
});
