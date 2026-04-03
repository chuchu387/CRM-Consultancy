import { useCallback, useEffect, useMemo, useState } from "react";

const DISMISS_KEY = "crm_mobile_prompt_dismissed";

const isStandaloneMode = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
};

const isIosDevice = () =>
  typeof window !== "undefined" &&
  /iphone|ipad|ipod/i.test(window.navigator.userAgent || "");

const usePwaInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneMode());
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return localStorage.getItem(DISMISS_KEY) === "true";
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      localStorage.removeItem(DISMISS_KEY);
      setDismissed(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return false;
    }

    deferredPrompt.prompt();
    const outcome = await deferredPrompt.userChoice;

    if (outcome.outcome === "accepted") {
      setIsInstalled(true);
      localStorage.removeItem(DISMISS_KEY);
      setDismissed(false);
    }

    setDeferredPrompt(null);
    return outcome.outcome === "accepted";
  }, [deferredPrompt]);

  return useMemo(
    () => ({
      canInstall: Boolean(deferredPrompt),
      promptInstall,
      isInstalled,
      isIosInstallable: isIosDevice() && !isStandaloneMode(),
      dismissed,
      dismissPrompt,
    }),
    [deferredPrompt, dismissPrompt, dismissed, isInstalled, promptInstall]
  );
};

export default usePwaInstall;
