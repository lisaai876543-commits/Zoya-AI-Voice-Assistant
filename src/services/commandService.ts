import { matchThemeFromVoice, getNextTheme, setActiveTheme } from "../utils/themeManager";
import { dispatchTaskEnergy } from "./taskAnimationService";

export interface ProcessCommandResult {
  action: string;
  url?: string;
  isBrowserAction: boolean;
  isNativeOnly?: boolean;
}

export function processCommand(
  command: string,
  userName: string = "Usman",
  enableBrowserActions: boolean = true
): ProcessCommandResult {
  const lowerCmd = command.toLowerCase().trim();

  // 0. Theme Switching Commands ("Zoya, change theme", "Zoya, next theme", "Zoya, change theme to Crimson Blaze")
  const themeMatch = matchThemeFromVoice(lowerCmd);
  if (themeMatch.matches) {
    let appliedTheme;
    if (themeMatch.isNext) {
      appliedTheme = getNextTheme();
    } else if (themeMatch.theme) {
      appliedTheme = setActiveTheme(themeMatch.theme.id);
    }
    if (appliedTheme) {
      dispatchTaskEnergy(
        "task-target-theme-btn",
        `Theme: ${appliedTheme.name}`,
        `Switched palette to ${appliedTheme.name}`,
        "settings",
        2800
      );
      return {
        action: `Theme Switched: Activated ${appliedTheme.name} theme for you, ${userName}.`,
        isBrowserAction: false,
      };
    }
  }

  // 1. Check for Screen Visibility / Inspection or Native-Only Android Feature requests (Strict Honesty)
  const isWebpageInspection =
    lowerCmd.includes("see my tab") ||
    lowerCmd.includes("see this page") ||
    lowerCmd.includes("look at this page") ||
    lowerCmd.includes("read this website") ||
    lowerCmd.includes("inspect this tab") ||
    lowerCmd.includes("inspect this webpage") ||
    lowerCmd.includes("what is on this page");

  if (isWebpageInspection) {
    return {
      action: "I can open the page, but I cannot currently see its contents in this web version.",
      isBrowserAction: false,
    };
  }

  const isScreenReading =
    lowerCmd.includes("read my screen") ||
    lowerCmd.includes("what is on my screen") ||
    lowerCmd.includes("read screen") ||
    lowerCmd.includes("see my screen") ||
    lowerCmd.includes("screen text");

  const isUiClickingOrTouch =
    lowerCmd.includes("click on") ||
    lowerCmd.includes("tap on") ||
    lowerCmd.includes("touch the") ||
    lowerCmd.includes("press button") ||
    lowerCmd.includes("click button") ||
    lowerCmd.includes("swipe screen") ||
    lowerCmd.includes("scroll down for me") ||
    lowerCmd.includes("automate touch");

  const isAutoReply =
    lowerCmd.includes("auto reply") ||
    lowerCmd.includes("auto-reply") ||
    lowerCmd.includes("silent send") ||
    lowerCmd.includes("send whatsapp directly without opening") ||
    lowerCmd.includes("send without opening");

  const isCallControl =
    lowerCmd.includes("answer call") ||
    lowerCmd.includes("reject call") ||
    lowerCmd.includes("pick up call") ||
    lowerCmd.includes("dial phone call");

  const isTouchGuardOrSos =
    lowerCmd.includes("touch guard") ||
    lowerCmd.includes("pocket mode") ||
    lowerCmd.includes("silent sos") ||
    lowerCmd.includes("emergency sms automatically");

  if (isScreenReading || isUiClickingOrTouch || isAutoReply || isCallControl || isTouchGuardOrSos) {
    let specificReason = "Screen reading, UI clicking, and touch automation require the Native Android Companion App (using Android Accessibility Services and OS permissions).";
    if (isScreenReading) {
      specificReason = "I can open the page, but I cannot currently see its contents in this web version. Live screen inspection requires the Native Android Accessibility Companion.";
    } else if (isAutoReply) {
      specificReason = "Autonomous background WhatsApp replies require Android Notification Listener and Accessibility Services. In this web app, I prepare a draft for you to review and send.";
    } else if (isCallControl) {
      specificReason = "Direct cellular call control requires the Native Android TelecomManager framework. Web browsers are restricted from answering or manipulating calls.";
    } else if (isTouchGuardOrSos) {
      specificReason = "Touch Guard and autonomous background SOS require Android system overlay windows and background SMS permissions, which are native Android features.";
    }

    dispatchTaskEnergy(
      "task-target-nav-android",
      "Android Architecture",
      "Native Android feature requested",
      "system",
      3000
    );

    return {
      action: `Honest Notice: That action is a Native Android Companion feature. ${specificReason} Check the Android tab for the complete architectural blueprint.`,
      isBrowserAction: false,
      isNativeOnly: true,
    };
  }

  // 1.5 Check if Browser Actions are disabled
  if (!enableBrowserActions) {
    if (
      lowerCmd.includes("youtube") ||
      lowerCmd.includes("spotify") ||
      lowerCmd.includes("whatsapp") ||
      lowerCmd.startsWith("open ")
    ) {
      return {
        action: "Browser actions are currently disabled in Settings. You can enable them under Settings → Tools & Browser Actions.",
        isBrowserAction: false,
      };
    }
  }

  // 2. Media Search: "Play [song/video] on YouTube"
  const ytMatch = lowerCmd.match(/^play\s+(.+?)\s+on\s+youtube$/);
  if (ytMatch) {
    const query = encodeURIComponent(ytMatch[1].trim());
    dispatchTaskEnergy(
      "task-target-action-card",
      "YouTube Action",
      `Searching "${ytMatch[1]}"`,
      "external",
      3200
    );
    return {
      action: `YouTube Link Opened: Searching for "${ytMatch[1]}" for you, ${userName}.`,
      url: `https://www.youtube.com/results?search_query=${query}`,
      isBrowserAction: true,
    };
  }

  // 3. Media Search: "Search [query] on Spotify"
  const spotifyMatch = lowerCmd.match(/^search\s+(.+?)\s+on\s+spotify$/);
  if (spotifyMatch) {
    const query = encodeURIComponent(spotifyMatch[1].trim());
    dispatchTaskEnergy(
      "task-target-action-card",
      "Spotify Action",
      `Searching "${spotifyMatch[1]}"`,
      "external",
      3200
    );
    return {
      action: `Spotify Link Opened: Searching for "${spotifyMatch[1]}" on Spotify for you, ${userName}.`,
      url: `https://open.spotify.com/search/${query}`,
      isBrowserAction: true,
    };
  }

  // 4. WhatsApp Web Draft: "Send a WhatsApp message to [number] saying [message]"
  const waMatch = lowerCmd.match(
    /^send\s+a\s+whatsapp\s+message\s+to\s+([\d\+\s]+)\s+saying\s+(.+)$/,
  );
  if (waMatch) {
    const number = waMatch[1].replace(/\s+/g, "");
    const message = encodeURIComponent(waMatch[2].trim());
    dispatchTaskEnergy(
      "task-target-action-card",
      "WhatsApp Draft",
      `Drafting message for ${number}`,
      "external",
      3200
    );
    return {
      action: `Draft Prepared: Your WhatsApp message for ${number} has been prefilled. Tap Open Draft to review and send it.`,
      url: `https://web.whatsapp.com/send?phone=${number}&text=${message}`,
      isBrowserAction: true,
    };
  }

  // 5. General Browsing: "Open [website name]"
  const openMatch = lowerCmd.match(/^open\s+(.+)$/);
  if (
    openMatch &&
    !lowerCmd.includes("youtube") &&
    !lowerCmd.includes("spotify")
  ) {
    let website = openMatch[1].trim().replace(/\s+/g, "");
    if (!website.includes(".")) {
      website += ".com";
    }
    dispatchTaskEnergy(
      "task-target-action-card",
      "Web Navigation",
      `Opening ${openMatch[1]}`,
      "external",
      3000
    );
    return {
      action: `Link Opened: Preparing external navigation to ${openMatch[1]} for you, ${userName}.`,
      url: `https://www.${website}`,
      isBrowserAction: true,
    };
  }

  return { action: "", isBrowserAction: false };
}
