import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss()],
	root: "src/ui",
	server: {
		port: 3000,
	},
});
