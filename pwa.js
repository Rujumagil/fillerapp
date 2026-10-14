let fillerInstallPrompt = null;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  fillerInstallPrompt = event;
  document.querySelectorAll("[data-install-app]").forEach(button => {
    button.hidden = false;
  });
});

async function fillerInstallApp() {
  if (fillerInstallPrompt) {
    fillerInstallPrompt.prompt();
    await fillerInstallPrompt.userChoice;
    fillerInstallPrompt = null;
    return;
  }
  alert("Para instalar: abre el menu del navegador y elige 'Agregar a pantalla principal' o 'Instalar app'.");
}

async function fillerRequestNotifications() {
  if (!("Notification" in window)) {
    alert("Este navegador no permite notificaciones.");
    return false;
  }
  if (Notification.permission === "granted") return true;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

async function fillerNotify(title, body) {
  const allowed = await fillerRequestNotifications();
  if (!allowed) return;
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    registration.showNotification(title, {
      body,
      icon: "./assets/filler-icon-192.png",
      badge: "./assets/filler-icon-192.png"
    });
  } else {
    new Notification(title, { body, icon: "./assets/filler-icon-192.png" });
  }
}
