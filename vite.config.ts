import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		watch: {
			// inotify doesn't fire for files on the Windows NTFS filesystem when
			// Vite runs inside WSL. Polling detects changes across the boundary.
			usePolling: true,
			interval: 500
		}
	}
});
