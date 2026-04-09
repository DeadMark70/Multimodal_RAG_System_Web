import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router-dom/') ||
            id.includes('/@tanstack/react-query/') ||
            id.includes('/zustand/')
          ) {
            return 'react-vendor';
          }

          if (
            id.includes('/@chakra-ui/react/') ||
            id.includes('/@emotion/react/') ||
            id.includes('/@emotion/styled/') ||
            id.includes('/framer-motion/') ||
            id.includes('/react-icons/')
          ) {
            return 'ui-vendor';
          }

          if (
            id.includes('/react-force-graph-2d/') ||
            id.includes('/react-force-graph-3d/') ||
            id.includes('/three/') ||
            id.includes('/@xyflow/react/')
          ) {
            return 'graph-vendor';
          }

          if (
            id.includes('/react-markdown/') ||
            id.includes('/remark-gfm/') ||
            id.includes('/rehype-sanitize/')
          ) {
            return 'markdown-vendor';
          }

          return 'vendor';
        },
      },
    },
  },
});
