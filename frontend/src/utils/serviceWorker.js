export const registerServiceWorker = () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const isSupportedEnvironment =
    import.meta.env.PROD || ["localhost", "127.0.0.1"].includes(window.location.hostname);

  if (!isSupportedEnvironment) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
};
