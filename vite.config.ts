import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative asset paths for GitHub Pages compatibility.
  base: "./",
  plugins: [react()],
});

