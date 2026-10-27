/* Filler Café: fotografías en IndexedDB para no agotar localStorage.
   Las imágenes permanecen en el navegador hasta que se conecte el almacenamiento compartido. */
(function () {
  "use strict";
  const DATABASE = "filler-cafe-media-v1", STORE = "product-photos";
  const cached = new Map();
  let connection;
  function open() {
    if (!("indexedDB" in window)) return Promise.reject(new Error("Este navegador no permite guardar fotografías locales."));
    if (!connection) connection = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
      request.onerror = () => reject(request.error || new Error("No se pudo abrir el almacenamiento de fotos."));
      request.onblocked = () => reject(new Error("Cierra otras pestañas de Filler Café y vuelve a intentarlo."));
    }).catch(error => { connection = null; throw error; });
    return connection;
  }
  async function compress(file) {
    if (!file || !file.type.startsWith("image/") || file.type === "image/svg+xml") throw new Error("Selecciona una fotografía JPG, PNG o WebP.");
    if (file.size > 25 * 1024 * 1024) throw new Error("Esta imagen supera 25 MB. Selecciona una foto más pequeña.");
    const address = URL.createObjectURL(file);
    let image;
    try {
      image = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("No pude abrir esta imagen. Prueba con un archivo JPG o PNG."));
        el.src = address;
      });
      const longest = Math.max(image.naturalWidth, image.naturalHeight);
      if (!longest) throw new Error("La fotografía está vacía.");
      const scale = Math.min(1, 1100 / longest);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo procesar la imagen.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return await new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Error al optimizar la fotografía.")), "image/jpeg", 0.82);
      });
    } finally { URL.revokeObjectURL(address); }
  }
  async function write(id, blob) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, String(id));
      tx.oncomplete = () => {
        const last = cached.get(String(id));
        if (last && typeof last === "string") URL.revokeObjectURL(last);
        cached.delete(String(id));
        resolve(String(id));
      };
      tx.onerror = () => reject(tx.error || new Error("No se pudo guardar la fotografía."));
      tx.onabort = () => reject(tx.error || new Error("El almacenamiento de fotos está lleno o bloqueado."));
    });
  }
  async function putFile(id, file) { return write(id, await compress(file)); }
  async function getURL(id) {
    if (!id) return "";
    const key = String(id);
    if (cached.has(key)) return cached.get(key);
    const promise = (async () => {
      const db = await open();
      const blob = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error || new Error("No se encontró la imagen."));
      });
      if (!blob) return "";
      return URL.createObjectURL(blob);
    })();
    cached.set(key, promise);
    try {
      const result = await promise;
      cached.set(key, result);
      return result;
    } catch (error) {
      cached.delete(key);
      throw error;
    }
  }
  async function applyImages(root) {
    if (!root) return;
    const elements = root.querySelectorAll("[data-photo-key]");
    for (const el of elements) {
      const key = el.dataset.photoKey;
      if (!key) continue;
      try {
        const src = await getURL(key);
        if (!el.isConnected || el.dataset.photoKey !== key || !src) continue;
        // La foto auténtica siempre tiene prioridad sobre el logo provisional.
        el.dataset.hasPhoto = "true";
        if (el.tagName === "IMG") {
          el.src = src;
        } else {
          el.style.backgroundImage = 'url("' + src + '")';
          el.style.backgroundPosition = "center center";
          el.style.backgroundSize = "contain";
          el.style.backgroundRepeat = "no-repeat";
          el.style.backgroundColor = "#ffffff";
        }
      } catch (error) {
        console.warn("Foto de platillo no disponible:", error);
      }
    }
  }
  async function migrateMenu(menu) {
    if (!Array.isArray(menu)) return false;
    let changed = false;
    for (const item of menu) {
      if (!item || typeof item.image !== "string" || !item.image.startsWith("data:image/")) continue;
      try {
        const response = await fetch(item.image);
        const blob = await response.blob();
        await putFile(item.id, new File([blob], "foto.jpg", { type: blob.type || "image/jpeg" }));
        item.imageKey = String(item.id);
        delete item.image;
        changed = true;
      } catch (error) {
        console.warn("Se conservó una foto anterior sin migrar:", error);
      }
    }
    if (changed) {
      try { localStorage.setItem("fillerMenu", JSON.stringify(menu)); }
      catch (error) { console.warn("No se pudo terminar de compactar el menú:", error); }
    }
    return changed;
  }
  window.FillerPhotos = Object.freeze({ putFile, getURL, applyImages, migrateMenu });
})();
