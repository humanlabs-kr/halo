import { MiniKit } from "@worldcoin/minikit-js";

export type ImpactStyle = "light" | "medium" | "heavy";
export type NotificationStyle = "success" | "warning" | "error";

interface ImpactHapticOptions {
    hapticsType: "impact";
    style: ImpactStyle;
}

interface NotificationHapticOptions {
    hapticsType: "notification";
    style: NotificationStyle;
}

interface SelectionChangedHapticOptions {
    hapticsType: "selection-changed";
    style?: never;
}

type HapticFeedbackOptions =
    | ImpactHapticOptions
    | NotificationHapticOptions
    | SelectionChangedHapticOptions;

export function sendLightImpactHaptic() {
    MiniKit.commands.sendHapticFeedback({ hapticsType: "impact", style: "light" });
}
export function sendSuccessNotificationHaptic() {
    MiniKit.commands.sendHapticFeedback({ hapticsType: "notification", style: "success" });
}

export function sendHapticFeedback(options: HapticFeedbackOptions) {
    MiniKit.commands.sendHapticFeedback(options);
}

