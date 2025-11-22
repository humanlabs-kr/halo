import { MiniKit, Permission } from "@worldcoin/minikit-js";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export type WorldPermissionState = {
  // State
  initialized: boolean;
  status: Record<Permission, boolean>;

  canRequest: Record<Permission, boolean>;
};

export type WorldPermissionActions = {
  syncPermission: () => Promise<void>;
  /**
   * Request permission if not granted
   * @param permission
   * @returns
   */
  safeRequestPermission: (
    permission: Permission,
    events?: {
      onSuccess?: () => void;
      onAlreadyDeclined?: () => void;
      onPermissionDisabledOnWorldApp?: () => void;
      onDeclined?: () => void;
    }
  ) => Promise<void>;
};

export type WorldPermissionStore = WorldPermissionState &
  WorldPermissionActions;

const initialState: WorldPermissionState = {
  initialized: false,
  status: {
    [Permission.Notifications]: false,
    [Permission.Contacts]: false,
    [Permission.Microphone]: false,
  },
  canRequest: {
    [Permission.Notifications]: false,
    [Permission.Contacts]: false,
    [Permission.Microphone]: false,
  },
};

export const useWorldPermissionStore = create<WorldPermissionStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        syncPermission: async () => {
          const { finalPayload } = await MiniKit.commandsAsync.getPermissions();
          if (finalPayload.status === "success") {
            const list = Object.entries(finalPayload.permissions)
              .map(([key, value]) => [key as Permission, value as boolean])
              .sort((a, b) =>
                (a.at(0) as Permission).localeCompare(b.at(0) as Permission)
              );

            if (!list.find(([key]) => key === Permission.Notifications)) {
              console.error(
                "Add Notification permission in worldcoin developer console"
              );
            }
            set({
              status: Object.fromEntries(list),
              canRequest: Object.fromEntries(
                list.map(([key, value]) => [key, value ? false : true])
              ),
            });
          } else {
            console.error(finalPayload.error_code);
            console.error(finalPayload.details);
            set(initialState);
          }
        },
        safeRequestPermission: async (
          permission: Permission,
          events?: {
            /**
             * 푸시노티를 승인한 경우
             * @returns
             */
            onSuccess?: () => void;
            /**
             * 이미 이전에 푸시노티를 거절한 경우
             * @returns
             */
            onAlreadyDeclined?: () => void;
            /**
             * 푸시노티가 앱단에서 비활성화된 경우
             * @returns
             */
            onPermissionDisabledOnWorldApp?: () => void;
            /**
             * 푸시노티를 거절한 경우
             * @returns
             */
            onDeclined?: () => void;
          }
        ) => {
          if (get().status[permission]) {
            return;
          }

          if (!get().canRequest[permission]) {
            events?.onAlreadyDeclined?.();
            return;
          }

          const { finalPayload } =
            await MiniKit.commandsAsync.requestPermission({
              permission,
            });

          if (finalPayload.status === "success") {
            set((state) => ({
              status: {
                ...state.status,
                [permission]: true,
              },
              canRequest: {
                ...state.canRequest,
                [permission]: false,
              },
            }));
            events?.onSuccess?.();
          } else {
            switch (finalPayload.error_code) {
              case "user_rejected":
                console.error("User declined permission request");
                events?.onDeclined?.();
                set((state) => ({
                  status: {
                    ...state.status,
                    [permission]: false,
                  },
                  canRequest: {
                    ...state.canRequest,
                    [permission]: false,
                  },
                }));
                break;
              case "generic_error":
                console.error("Request failed for unknown reason");
                break;
              case "already_requested":
                console.error(
                  "User has already declined turning on notifications once"
                );
                events?.onAlreadyDeclined?.();
                set((state) => ({
                  status: {
                    ...state.status,
                    [permission]: false,
                  },
                  canRequest: {
                    ...state.canRequest,
                    [permission]: false,
                  },
                }));
                break;
              case "permission_disabled":
                console.error("User has notification disabled for World App");
                events?.onPermissionDisabledOnWorldApp?.();
                set((state) => ({
                  status: {
                    ...state.status,
                    [permission]: false,
                  },
                  canRequest: {
                    ...state.canRequest,
                    [permission]: false,
                  },
                }));
                break;
              case "already_granted":
                console.error(
                  "User has already granted this mini app permission"
                );
                set((state) => ({
                  status: {
                    ...state.status,
                    [permission]: true,
                  },
                  canRequest: {
                    ...state.canRequest,
                    [permission]: false,
                  },
                }));
                break;
              case "unsupported_permission":
                console.error("Permission is not supported yet");
                set((state) => ({
                  status: {
                    ...state.status,
                    [permission]: false,
                  },
                  canRequest: {
                    ...state.canRequest,
                    [permission]: false,
                  },
                }));
                break;
              default:
                console.error(finalPayload.description);
            }
          }
          get().syncPermission();
        },
      }),
      {
        name: "world-permission-store",
      }
    )
  )
);
