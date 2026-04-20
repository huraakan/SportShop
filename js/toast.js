(function () {
  function showToast(text = "", type = "info", duration = 2200) {
    const container = document.getElementById("toast-container");
    if (!container || !text) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = text;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
      }, 260);
    }, duration);
  }

  window.showToast = showToast;
})();