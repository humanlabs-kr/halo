import { callApi } from "@/lib/fetch-client";
import {
  getAuthSessionMiniappNonce,
  getAuthSessionStatus,
  GetAuthSessionStatus200,
  postAuthSessionMiniappComplete,
  postAuthSessionRevoke,
} from "@/lib/generated/fetch";
import { MiniKit } from "@worldcoin/minikit-js";
import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";

export type WorldAuthState = {
  // State
  isLoading: boolean;
  isInitialized: boolean; // Has the provider been initialized?
  isInstalled: boolean; // Are we running in the World App?
  isAuthenticated: boolean; // Session should not be null if isAuthenticated is true
  // user data
  user: GetAuthSessionStatus200 | null;
  // Onboarding state
  hasSeenOnboarding: boolean;
  showOnboarding: boolean;
  hasCompletedTour: boolean;
};

export type WorldAuthActions = {
  // Actions
  checkSession: () => Promise<void>;
  signInWallet: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  // Internal state setters
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setInstalled: (installed: boolean) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setUser: (user: WorldAuthState["user"]) => void;
  setHasSeenOnboarding: (hasSeenOnboarding: boolean) => void;
  setShowOnboarding: (showOnboarding: boolean) => void;
  setHasCompletedTour: (hasCompletedTour: boolean) => void;
};

export type WorldAuthStore = WorldAuthState & WorldAuthActions;

const initialState: WorldAuthState = {
  isLoading: true,
  isInitialized: false,
  isInstalled: false,
  isAuthenticated: false,
  user: null,
  hasSeenOnboarding: false,
  showOnboarding: false,
  hasCompletedTour: false,
};

export const useWorldAuthStore = create<WorldAuthStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          ...initialState,

          // State setters
          setLoading: (loading) => set({ isLoading: loading }),
          setInitialized: (initialized) => set({ isInitialized: initialized }),
          setInstalled: (installed) => set({ isInstalled: installed }),
          setAuthenticated: (authenticated) =>
            set({ isAuthenticated: authenticated }),
          setUser: (user) => set({ user }),
          setHasSeenOnboarding: (hasSeenOnboarding) =>
            set({ hasSeenOnboarding }),
          setShowOnboarding: (showOnboarding) => set({ showOnboarding }),
          setHasCompletedTour: (hasCompletedTour) => set({ hasCompletedTour }),

          // Actions
          checkSession: async () => {
            const { isInitialized } = get();
            if (!isInitialized) {
              set({
                isAuthenticated: false,
                isLoading: false,
                user: null,
              });
              return;
            }

            const res = await callApi(getAuthSessionStatus);

            if (res.error) {
              set({
                isAuthenticated: false,
                isLoading: false,
                user: null,
              });
              return;
            }

            set({
              isAuthenticated: true,
              isLoading: false,
              user: res.data,
            });
          },

          signInWallet: async () => {
            const { isInstalled } = get();

            if (!isInstalled) {
              return { success: false, error: "not installed" };
            }

            set({ isLoading: true });

            const res = await callApi(getAuthSessionMiniappNonce);

            if (res.error) {
              set({ isLoading: false });
              return { success: false, error: res.error.code };
            }

            const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
              nonce: res.data.nonce,
              requestId: "0", // requestId is optional, but must be a string if provided
              expirationTime: new Date(
                new Date().getTime() + 7 * 24 * 60 * 60 * 1000
              ),
              statement:
                "This is my statement and here is a link https://worldcoin.com/apps",
            });

            if (finalPayload.status === "error") {
              set({ isLoading: false });
              return { success: false };
            }

            const response = await callApi(postAuthSessionMiniappComplete, {
              payload: finalPayload,
              nonce: res.data.nonce,
              hmac: res.data.hmac,
            });

            if (response.error) {
              set({
                isAuthenticated: false,
                isLoading: false,
              });
              return { success: false, error: "failed due to exception" };
            }

            await get().checkSession();
            return { success: true };
          },
          signOut: async () => {
            set({ isLoading: true });
            const res = await callApi(postAuthSessionRevoke);

            if (res.error) {
              set({ isLoading: false });
              return;
            }

            set({ isLoading: false, isAuthenticated: false, user: null });
            return;
          },
        }),
        {
          name: "world-auth-store",
        }
      )
    )
  )
);
