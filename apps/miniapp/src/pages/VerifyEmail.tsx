import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Trans, useTranslation } from "react-i18next";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { TURNSTILE_SITE_KEY } from "@/lib/env";
import { useAuthStore } from "@/stores/auth";
import { useEmailVerificationStore } from "@/stores/emailVerification";

type Step = "email" | "otp" | "success";

function VerifyEmail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/rewards";
  const platform = useAuthStore((s) => s.platform);

  const {
    email,
    error,
    isLoading,
    otpExpiresAt,
    cooldownUntil,
    isVerified,
    verifiedEmail,
    setEmail,
    checkStatus,
    sendCode,
    verifyCode,
    clearError,
  } = useEmailVerificationStore();

  const [step, setStep] = useState<Step>("email");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [cooldownLeft, setCooldownLeft] = useState<number>(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  // Arriving already verified means there is nothing to do here. Verifying
  // during this visit also flips `isVerified`, so the guard below keeps the
  // success screen on-screen instead of redirecting out from under the user.
  const justVerifiedRef = useRef(false);
  useEffect(() => {
    if (isVerified && !justVerifiedRef.current) {
      navigate(returnTo, { replace: true });
    }
  }, [isVerified, navigate, returnTo]);

  useEffect(() => {
    if (platform) void checkStatus(platform);
  }, [checkStatus, platform]);

  // Timer for OTP expiry
  useEffect(() => {
    if (!otpExpiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(
        0,
        Math.floor((otpExpiresAt.getTime() - now) / 1000),
      );
      setTimeLeft(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [otpExpiresAt]);

  // Timer for cooldown
  useEffect(() => {
    if (!cooldownUntil) return;

    const updateCooldown = () => {
      const now = Date.now();
      const diff = Math.max(
        0,
        Math.floor((cooldownUntil.getTime() - now) / 1000),
      );
      setCooldownLeft(diff);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when complete
    const fullCode = newOtp.join("");
    if (fullCode.length === 6) {
      handleVerifyCode(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i] ?? "";
    }
    setOtp(newOtp);

    // Auto-verify if complete
    if (pastedData.length === 6) {
      handleVerifyCode(pastedData);
    }
  };

  const handleSendCode = async () => {
    if (!turnstileToken || !platform) return;
    const success = await sendCode(platform, turnstileToken);
    if (success) {
      setTurnstileToken(null);
      setStep("otp");
    } else {
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (!platform) return;
    const success = await verifyCode(platform, code);
    if (success) {
      justVerifiedRef.current = true;
      setStep("success");
    }
  };

  const handleResendCode = async () => {
    if (cooldownLeft > 0) return;
    setOtp(["", "", "", "", "", ""]);
    // Go back to email step to get fresh turnstile token
    setStep("email");
  };

  const handleBack = () => {
    if (step === "otp") {
      setStep("email");
      setOtp(["", "", "", "", "", ""]);
      clearError();
    } else {
      navigate(-1);
    }
  };

  const handleSuccessContinue = () => {
    navigate(returnTo, { replace: true });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      {/* Header */}
      <div className="px-5 pt-6">
        <div className="mb-1 flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex size-10 items-center justify-center rounded-full bg-[#F4F4F4] transition hover:bg-[#E5E5E5]"
            aria-label={t("Go back")}
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-black"
            >
              <path d="M12 15l-5-5 5-5" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">
            {step === "email" && t("Verify Email")}
            {step === "otp" && t("Enter Code")}
            {step === "success" && t("Verified!")}
          </h1>
        </div>
        <p className="mt-2 pl-[52px] text-sm text-[#8D8D8D]">
          {step === "email" && t("Required to enter raffles")}
          {step === "otp" && t("Code sent to {{email}}", { email })}
          {step === "success" && t("Your email has been verified")}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-8">
        {/* Email Step */}
        {step === "email" && (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-black">
                {t("Email Address")}
              </label>
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder={t("your@email.com")}
                className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-4 text-[16px] text-black placeholder-gray-400 focus:border-black focus:outline-none"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            {error && <p className="text-sm text-red-500">{t(error)}</p>}

            <div className="flex justify-center">
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
                onError={() => setTurnstileToken(null)}
                options={{ theme: "light" }}
              />
            </div>

            <button
              type="button"
              onClick={handleSendCode}
              disabled={isLoading || !email || !turnstileToken}
              className={`w-full rounded-full py-4 text-base font-semibold text-white transition ${
                !isLoading && email && turnstileToken
                  ? "bg-black hover:bg-black/90"
                  : "bg-[#D6D6D6] cursor-not-allowed"
              }`}
            >
              {isLoading ? t("Sending...") : t("Send Verification Code")}
            </button>

            <p className="text-center text-xs text-[#8D8D8D]">
              {t("Once verified, this email cannot be changed.")}
            </p>
          </div>
        )}

        {/* OTP Step */}
        {step === "otp" && (
          <div className="space-y-6">
            {/* OTP Input */}
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  maxLength={1}
                  className="h-14 w-12 rounded-xl border-2 border-gray-200 bg-white text-center text-2xl font-bold text-black focus:border-black focus:outline-none"
                  disabled={isLoading}
                />
              ))}
            </div>

            {/* Timer */}
            {timeLeft > 0 && (
              <p className="text-center text-sm text-[#8D8D8D]">
                <Trans
                  i18nKey="Code expires in <strong>{{time}}</strong>"
                  values={{ time: formatTime(timeLeft) }}
                  components={{
                    strong: <span className="font-semibold text-black" />,
                  }}
                />
              </p>
            )}

            {timeLeft === 0 && otpExpiresAt && (
              <p className="text-center text-sm text-red-500">
                {t("Code expired. Please request a new one.")}
              </p>
            )}

            {error && (
              <p className="text-center text-sm text-red-500">{t(error)}</p>
            )}

            {/* Resend / Change Email */}
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={cooldownLeft > 0 || isLoading}
                className={`text-sm font-medium ${
                  cooldownLeft > 0 || isLoading
                    ? "text-gray-400"
                    : "text-black underline"
                }`}
              >
                {cooldownLeft > 0
                  ? t("Resend in {{seconds}}s", { seconds: cooldownLeft })
                  : t("Resend Code")}
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp(["", "", "", "", "", ""]);
                  clearError();
                }}
                disabled={isLoading}
                className="text-sm font-medium text-black underline"
              >
                {t("Change Email")}
              </button>
            </div>

            {isLoading && (
              <p className="text-center text-sm text-[#8D8D8D]">{t("Verifying...")}</p>
            )}
          </div>
        )}

        {/* Success Step */}
        {step === "success" && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-10 w-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <div>
              <p className="text-lg font-semibold text-black">{t("Email Verified")}</p>
              <p className="mt-1 text-sm text-[#8D8D8D]">{verifiedEmail}</p>
            </div>

            <button
              type="button"
              onClick={handleSuccessContinue}
              className="w-full rounded-full bg-black py-4 text-base font-semibold text-white hover:bg-black/90"
            >
              {t("Continue to Raffle")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
