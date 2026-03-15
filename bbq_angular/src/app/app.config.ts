// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core'
import { provideRouter, withHashLocation, withViewTransitions } from '@angular/router'
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http'
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'
import {
  provideAngularQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental'
import { routes } from './app.routes'
import { errorInterceptor } from './core/interceptors/error.interceptor'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      gcTime:    5 * 60_000,
      retry: 0,
      refetchOnWindowFocus: true,
    },
  },
})

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withHashLocation(), withViewTransitions()),
    provideHttpClient(withFetch(), withInterceptors([errorInterceptor])),
    provideAnimationsAsync(),
    provideAngularQuery(queryClient),
  ],
}
