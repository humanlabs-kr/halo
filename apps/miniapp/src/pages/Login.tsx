import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { hasCompletedOnboarding } from "@/lib/onboarding-storage";
import { useAuthStore } from "@/stores/auth";
import { useTranslation } from "react-i18next";
import { sendLightImpactHaptic } from "@/lib/haptic";

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  useEffect(() => {
    const preloadImages = [
      "/onboarding/step-2.webp",
      "/onboarding/step-3.webp",
    ];

    const linkElements = preloadImages.map((href) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = href;
      document.head.appendChild(link);
      return link;
    });

    return () => {
      linkElements.forEach((link) => {
        document.head.removeChild(link);
      });
    };
  }, []);

  const handleSignIn = async () => {
    sendLightImpactHaptic();
    const signedIn = await signIn();
    // The failure reason is already in the store and rendered below.
    if (!signedIn) return;
    navigate(hasCompletedOnboarding() ? "/home" : "/onboarding");
  };

  return (
    <div className="flex min-h-screen flex-col bg-white px-4 pt-[34px] text-center text-black">
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <img
          src="/logo_temp.png"
          alt="Halo"
          className="h-auto w-40 animate-login-float object-contain"
        />
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight">Halo</h1>
          <p className="text-base font-medium text-[#4A4A4A]">
            {t("L-qjJm49rZ")}
          </p>
        </div>
      </div>

      <div className="mt-10 mb-2 flex flex-col items-center gap-3">
        {error && <p className="px-2 text-sm text-red-500">{t(error)}</p>}
        <button
          type="button"
          className={`w-full rounded-full bg-black py-4 text-base font-semibold text-white ${isLoading ? "opacity-50" : ""}`}
          onClick={handleSignIn}
          disabled={isLoading}
        >
          {isLoading ? t("L-IXArjCtB") : t("L-4wGUcm56")}
        </button>
      </div>
      <footer className="mt-4 mb-6 flex flex-col items-center gap-2 text-xs text-gray-400">
        <p>{t("Operated by Human Labs")}</p>
        <div className="flex gap-3">
          <Link to="/terms" className="underline hover:text-gray-600">
            {t("Terms of Service")}
          </Link>
          <span>·</span>
          <Link to="/privacy" className="underline hover:text-gray-600">
            {t("Privacy Policy")}
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default Login;
