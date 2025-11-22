import { DEVELOPERS } from "../constants";
import { MiniKit } from "@worldcoin/minikit-js";
import { useWorldPermissionStore } from "./use-permission-store";
import { useWorldAuthStore } from "./use-world-auth-store";
import "@hl/client-common";

// 스토어 생성 후 자동으로 초기화 실행
const initializeMiniKit = async () => {
  try {
    MiniKit.install(import.meta.env.VITE_WORLD_APP_ID);
    const installed = MiniKit.isInstalled();
    return { installed, initialized: true };
  } catch (error) {
    console.error("MiniKit installation failed:", error);
    return { installed: false, initialized: true };
  }
};

// 유저가 로그인 되어있을 때 실행될 친구들
const whenAuthenticated = () => {
  const address = useWorldAuthStore.getState().user!.address;

  window.nsdk.setUser(
    import.meta.env.VITE_WORLD_APP_ID,
    address,
    useWorldPermissionStore.getState().status.notifications ?? true
  );

  console.log(`address: ${address}`);
  // 개발자 대상으로 eruda 실행
  if (DEVELOPERS.includes(address)) {
    import("eruda").then((eruda) => {
      eruda.default.init();
    });
  }
};

initializeMiniKit().then(({ installed, initialized }) => {
  useWorldAuthStore.setState({
    isInstalled: installed,
    isInitialized: initialized,
  });

  // 초기화 완료 후 세션 체크
  if (initialized) {
    // 유저 권한 동기화
    useWorldPermissionStore.getState().syncPermission();

    // 유저 로그인 완료를 watch
    useWorldAuthStore.subscribe(
      (state) => state.isAuthenticated,
      (isAuthenticated) => {
        if (isAuthenticated) {
          whenAuthenticated();
        }
      }
    );
    // 이미 이전에 authenticated 된 상태였다면 바로 실행
    if (useWorldAuthStore.getState().isAuthenticated) {
      whenAuthenticated();
    }
    // 유저 로그인 정보를 서버와 동기화
    useWorldAuthStore.getState().checkSession();
  }
});
