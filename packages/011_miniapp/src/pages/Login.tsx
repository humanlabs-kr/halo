import { useEffect } from "react";
import { useNavigate } from "react-router";
import HumanPassLink from "../components/HumanPassLink";
import { hasCompletedOnboarding } from "../utils/onboardingStorage";
import { sendLightImpactHaptic } from "../components/hapticFeedback";
import { useWorldAuthStore } from "../utils/state/use-world-auth-store";

function Login() {
  const navigate = useNavigate();
  const { signInWallet, isLoading } = useWorldAuthStore();

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
    await signInWallet();
    if (hasCompletedOnboarding()) {
      navigate("/home");
      return;
    }
    navigate("/onboarding");
  };

  return (
    <div className="flex min-h-screen flex-col bg-white px-4 py-[34px] text-center text-black">
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <img
          src="/logo_temp.png"
          alt="Receipto"
          className="h-auto w-40 animate-login-float object-contain"
        />
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight">Receipto</h1>
          <p className="text-base font-medium text-[#4A4A4A]">
            Snap a receipt, get rewarded.
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center gap-4 mb-2">
        <HumanPassLink />
        <button
          type="button"
          className={`w-full rounded-full bg-black py-4 text-base font-semibold text-white ${isLoading ? "opacity-50" : ""}`}
          onClick={handleSignIn}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Sign in"}
        </button>
      </div>
    </div>
  );
}

export default Login;
