export function renderImageAssetPreview(container, url, label) {
  const documentRef = container.ownerDocument;
  const image = documentRef.createElement("img");
  image.className = "asset-preview-image";
  image.alt = label;
  const status = documentRef.createElement("div");
  status.className = "asset-preview-empty";
  status.setAttribute("role", "status");
  status.textContent = "正在加载图片...";
  const retry = documentRef.createElement("button");
  retry.type = "button";
  retry.className = "mini-btn primary asset-preview-retry";
  retry.textContent = "重新加载";
  retry.hidden = true;
  const load = () => {
    image.hidden = true;
    retry.hidden = true;
    status.textContent = "正在加载图片...";
    status.hidden = false;
    image.src = url;
  };
  image.onload = () => {
    image.hidden = false;
    status.hidden = true;
  };
  image.onerror = () => {
    image.hidden = true;
    status.hidden = false;
    status.textContent = "图片未能加载。请确认附件仍在笔记库中、本地服务正常运行；导入的笔记需要一并导入原图片文件。";
    retry.hidden = false;
  };
  retry.addEventListener("click", () => {
    image.removeAttribute("src");
    load();
  });
  container.replaceChildren(image, status, retry);
  load();
}
