import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { Platform } from '@halo/contracts';
import { authApi, type SessionStatus } from '@/lib/api/auth';
import { AuthError, getAuthAdapter } from '@/lib/auth/adapter';
import { detectPlatform } from '@/lib/platform';

/**
 * One session store for all three chains. World, MiniPay and Kaia used to have
 * their own near-identical copies of this; the only real difference was the
 * wallet handshake, which now lives behind `AuthAdapter`.
 */

export type AuthState = {
  platform: Platform | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isBlacklisted: boolean;
  user: SessionStatus | null;
  /** Last sign-in failure, already phrased for display. Cleared on retry. */
  error: string | null;
  hasSeenOnboarding: boolean;
};

export type AuthActions = {
  checkSession: () => Promise<void>;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  setHasSeenOnboarding: (hasSeenOnboarding: boolean) => void;
};

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  platform: detectPlatform(),
  isLoading: false,
  isAuthenticated: false,
  isBlacklisted: false,
  user: null,
  error: null,
  hasSeenOnboarding: false,
};

/** Module-level guard: a second tap must not open a second wallet prompt. */
let signInInFlight = false;

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        setHasSeenOnboarding: (hasSeenOnboarding) => set({ hasSeenOnboarding }),

        checkSession: async () => {
          let user: SessionStatus;
          try {
            user = await authApi.status();
          } catch {
            // Any failure here — expired cookie, offline, 404 on a wiped user —
            // means there is no session to act on. The reason is not actionable.
            set({ isAuthenticated: false, isLoading: false, user: null });
            return;
          }

          set({
            isAuthenticated: true,
            isLoading: false,
            user,
            isBlacklisted: user.isBlacklisted,
          });
        },

        signIn: async () => {
          const platform = get().platform;
          if (!platform) {
            set({ error: 'This host is not configured for any Halo chain.' });
            return false;
          }
          if (signInInFlight) return false;

          signInInFlight = true;
          set({ isLoading: true, error: null });

          try {
            const adapter = getAuthAdapter(platform);
            await adapter.init();

            const challenge = await authApi.nonce().catch(() => {
              throw new AuthError('rejected', 'Could not start sign-in. Please try again.');
            });

            await adapter.signIn(challenge);
            await get().checkSession();
            return true;
          } catch (error) {
            const message =
              error instanceof AuthError
                ? error.message
                : 'Something went wrong. Please try again.';
            set({ isAuthenticated: false, isLoading: false, error: message });
            return false;
          } finally {
            signInInFlight = false;
          }
        },

        signOut: async () => {
          set({ isLoading: true });
          // A failed revoke still clears the client: the user asked to be signed
          // out, and leaving them "signed in" because the network blipped is worse
          // than a cookie that outlives the screen and expires on its own.
          await authApi.revoke().catch(() => {});
          set({
            isLoading: false,
            isAuthenticated: false,
            isBlacklisted: false,
            user: null,
            error: null,
          });
        },
      }),
      {
        name: 'halo.auth',
        // Only what survives a reload usefully. `isLoading` / `error` describe a
        // single attempt, and `platform` is re-detected from the host every boot.
        partialize: (state) => ({
          isAuthenticated: state.isAuthenticated,
          isBlacklisted: state.isBlacklisted,
          user: state.user,
          hasSeenOnboarding: state.hasSeenOnboarding,
        }),
      },
    ),
  ),
);
