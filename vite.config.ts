import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import type { Plugin } from 'vite';

// Security headers plugin - ONLY for production builds
// Development mode needs relaxed policies for HMR and hot reload
const securityHeadersPlugin = (mode: string): Plugin => ({
  name: 'security-headers',
  configureServer(server) {
    // Skip security headers in development to allow HMR and hot reload
    if (mode === 'development') {
      return;
    }
    
    server.middlewares.use((req, res, next) => {
      // Content Security Policy
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://www.googletagmanager.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "img-src 'self' data: https: blob:; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self';"
      );
      
      // Other security headers
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      
      next();
    });
  },
});

// Cache headers plugin for optimal caching strategy
const cacheHeadersPlugin = (mode: string): Plugin => ({
  name: 'cache-headers',
  configureServer(server) {
    // Only apply in production preview mode
    if (mode === 'development') {
      return;
    }
    
    server.middlewares.use((req, res, next) => {
      const url = req.url || '';
      
      // Hash-versioned assets (JS, CSS with hash in filename) - immutable, 1 year cache
      if (/\.(js|css)$/.test(url) && /-[a-zA-Z0-9]{8}\.(js|css)/.test(url)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // Images, fonts, audio, video - 1 year cache
      else if (/\.(png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|otf|mp3|mp4|wav|ogg)$/.test(url)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // Non-hashed JS/CSS (registerSW.js, etc) - 1 day cache
      else if (/\.(js|css)$/.test(url)) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
      // HTML files - no cache, must revalidate
      else if (/\.html$/.test(url) || url === '/') {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      }
      
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-toast',
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog'
          ],
          // Admin bundle
          'admin': [
            './src/pages/AdminDashboard.tsx',
            './src/pages/AdminGameProfiles.tsx',
            './src/pages/AdminPopularContent.tsx',
            './src/pages/PerformanceDashboard.tsx',
            './src/pages/RetentionDashboard.tsx',
            './src/pages/MonetizationDashboard.tsx',
            './src/pages/UserJourneyDashboard.tsx',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase warning limit for larger chunks
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    securityHeadersPlugin(mode),
    cacheHeadersPlugin(mode),
    // Image optimization plugin - automatically compresses images during build
    ViteImageOptimizer({
      png: {
        quality: 80,
      },
      jpeg: {
        quality: 80,
      },
      jpg: {
        quality: 80,
      },
      webp: {
        quality: 80,
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'robots.txt', 'dingleup-logo.png'],
      manifest: {
        name: 'DingleUP!',
        short_name: 'DingleUP!',
        description: 'Kvízjáték magyar nyelven',
        theme_color: '#9333ea',
        background_color: '#000000',
        display: 'fullscreen',
        orientation: 'portrait',
        icons: [
          {
            src: '/dingleup-logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/dingleup-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/dingleup-logo.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Játék indítása',
            short_name: 'Játék',
            description: 'Új játék indítása',
            url: '/game',
            icons: [{ src: '/dingleup-logo.png', sizes: '192x192' }]
          },
          {
            name: 'Ranglista',
            short_name: 'Ranglista',
            description: 'Napi ranglista megtekintése',
            url: '/leaderboard',
            icons: [{ src: '/dingleup-logo.png', sizes: '192x192' }]
          },
          {
            name: 'Profil',
            short_name: 'Profil',
            description: 'Profil beállítások',
            url: '/profile',
            icons: [{ src: '/dingleup-logo.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,mp4,mp3,woff,woff2}'],
        // Offline fallback strategy - serve app shell on navigation failures
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/admin/],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15MB for larger video files
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // PERFORMANCE OPTIMIZATION: Pre-cache critical assets for instant load
        additionalManifestEntries: [
          { url: '/dingleup-logo.png', revision: null },
          { url: '/src/assets/loading-video.mp4', revision: null }, // Loading video pre-cached
          { url: '/src/assets/DingleUP.mp3', revision: null },
          { url: '/src/assets/backmusic.mp3', revision: null },
          { url: '/src/assets/game-background.png', revision: null },
          { url: '/src/assets/hero-bg.jpg', revision: null }
        ],
        runtimeCaching: [
          // CRITICAL OPTIMIZATION: Loading Video - CacheFirst for instant playback
          // After 1st load, video plays instantly from cache (50-70% faster)
          {
            urlPattern: ({ url }) => url.pathname.includes('loading-video.mp4'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'critical-videos',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days cache
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              plugins: [
                {
                  // Force cache update on video change
                  cacheWillUpdate: async ({ request, response }) => {
                    return response;
                  }
                }
              ]
            }
          },
          // Other Videos - StaleWhileRevalidate for balance
          {
            urlPattern: /\.(?:mp4|webm)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'videos',
              expiration: {
                maxEntries: 15,
                maxAgeSeconds: 60 * 60 * 24 * 14 // 14 days cache
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Audio - StaleWhileRevalidate for instant playback + background update
          {
            urlPattern: /\.(?:mp3|wav|ogg)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'audio',
              expiration: {
                maxEntries: 25,
                maxAgeSeconds: 60 * 60 * 24 * 14 // 14 days cache
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Images - CacheFirst for instant load
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 250, // More images cached
                maxAgeSeconds: 60 * 60 * 24 * 90 // 90 days cache
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Fonts - CacheFirst for instant load
          {
            urlPattern: /\.(?:woff|woff2|ttf|otf)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 365 * 2 // 2 years
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Static JS/CSS - StaleWhileRevalidate for fast load + fresh updates
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Supabase API - NetworkFirst with shorter timeout for mobile
          {
            urlPattern: ({ url }) => url.origin === 'https://wdpxmwsxhckazwxufttk.supabase.co',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 180,
                maxAgeSeconds: 60 * 60 * 24 * 2 // 2 days cache
              },
              networkTimeoutSeconds: 5, // 5s timeout for mobile
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
