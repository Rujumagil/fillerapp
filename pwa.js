// Instalación PWA para Fiiller Clientes, Fiiller Pedidos y Fiiller Admin.
let fillerInstallPrompt = null;

function fillerInstalledMode() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true;
}

function fillerInstallInstructions() {
  const agent = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(agent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) {
    return "En iPhone/iPad abre esta página en Safari, toca Compartir y elige «Agregar a pantalla de inicio». Después toca «Agregar».";
  }
  if (/Android/i.test(agent)) {
    return "En Chrome para Android, toca el menú ⋮ y selecciona «Instalar aplicación» o «Agregar a pantalla principal».";
  }
  return "En Chrome o Edge, abre el menú ⋮ del navegador y selecciona «Instalar aplicación» o utiliza el icono de instalación en la barra de direcciones.";
}

function fillerInstallStatus(message) {
  const targets = [...document.querySelectorAll("[data-install-status]")];
  for (const el of targets) el.textContent = message;
  if (!targets.length) alert(message);
}

function fillerRefreshInstallButtons() {
  const installed = fillerInstalledMode();
  document.querySelectorAll("[data-install-app]").forEach(button => {
    button.hidden = installed;
    button.setAttribute("aria-hidden", String(installed));
  });
  document.querySelectorAll("[data-install-panel]").forEach(panel => { panel.hidden = installed; });
  if (installed) {
    for (const status of document.querySelectorAll("[data-install-status]")) {
      status.textContent = "Ya estás usando la aplicación instalada de Fiiller.";
    }
  }
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  fillerInstallPrompt = event;
  fillerRefreshInstallButtons();
  for (const status of document.querySelectorAll("[data-install-status]")) {
    status.textContent = "La instalación está disponible. Toca el botón para confirmarla.";
  }
});

window.addEventListener("appinstalled", () => {
  fillerInstallPrompt = null;
  for (const status of document.querySelectorAll("[data-install-status]")) {
    status.textContent = "¡Instalación completada! Abre Fiiller desde tus aplicaciones.";
  }
  document.querySelectorAll("[data-install-app]").forEach(button => { button.hidden = true; });
  document.querySelectorAll("[data-install-panel]").forEach(panel => { panel.hidden = true; });
});

async function fillerInstallApp() {
  if (fillerInstalledMode()) {
    fillerInstallStatus("Ya abriste Fiiller como aplicación instalada.");
    return;
  }
  if (!fillerInstallPrompt) {
    fillerInstallStatus(fillerInstallInstructions());
    return;
  }
  const promptEvent = fillerInstallPrompt;
  fillerInstallPrompt = null;
  try {
    // La solicitud de instalación se lanza directamente desde el clic del usuario.
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice?.outcome === "dismissed") {
      fillerInstallStatus("La instalación se canceló. Puedes instalar desde el menú de tu navegador. " + fillerInstallInstructions());
    } else {
      fillerInstallStatus("Confirma la instalación en tu dispositivo.");
    }
  } catch {
    fillerInstallStatus(fillerInstallInstructions());
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", fillerRefreshInstallButtons);
} else {
  fillerRefreshInstallButtons();
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
