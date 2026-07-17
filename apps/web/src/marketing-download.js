const DOWNLOAD_API_BASE = window.location.origin;

const COPY = {
  readFailed: "\u8bfb\u53d6\u4e0b\u8f7d\u4fe1\u606f\u5931\u8d25\u3002",
  notBuilt:
    "\u5f53\u524d\u4ed3\u5e93\u8fd8\u6ca1\u6709\u751f\u6210\u6b63\u5f0f\u5b89\u88c5\u5305\u3002\u8fd0\u884c\u684c\u9762\u6253\u5305\u540e\uff0c\u8fd9\u91cc\u4f1a\u5c55\u793a\u6700\u65b0\u53ef\u4e0b\u8f7d\u4ea7\u7269\u3002",
  notBuiltShort: "\u5c1a\u672a\u751f\u6210",
  notBuiltNote: "\u5f53\u524d\u8fd8\u6ca1\u6709\u6b63\u5f0f\u5b89\u88c5\u5305\u53ef\u4e0b\u8f7d\u3002",
  builtSummaryPrefix: "\u5f53\u524d\u5df2\u751f\u6210 ",
  builtSummarySuffix:
    " \u4e2a\u684c\u9762\u6784\u5efa\u4ea7\u7269\uff0c\u53ef\u7528\u4e8e\u5b89\u88c5\u5305\u5206\u53d1\u548c\u4e0b\u8f7d\u9875\u5c55\u793a\u3002",
  builtJustNow: "\u521a\u521a\u751f\u6210",
  primaryDownload:
    "\u4e0b\u8f7d\u6700\u65b0\u7248 Windows \u5b89\u88c5\u5305"
};

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

function setLink(selector, href, text) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.setAttribute("href", href);
  if (text) el.textContent = text;
  el.hidden = false;
}

function renderFileList(items) {
  const list = document.querySelector("[data-download-files]");
  if (!list) return;

  list.innerHTML = "";
  for (const item of items.slice(0, 6)) {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = item.downloadUrl || "#";
    link.textContent = `${item.file} - ${(item.bytes / 1024 / 1024).toFixed(2)} MB`;
    li.appendChild(link);
    list.appendChild(li);
  }
}

async function initDownloadPage() {
  const status = document.querySelector("[data-download-status]");
  if (!status) return;

  try {
    const response = await fetch(`${DOWNLOAD_API_BASE}/api/download-manifest`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.message || COPY.readFailed);
    }

    const item = payload?.item || {};
    setText("[data-download-version]", item.version || "0.1.0");

    if (!item.bundleReady) {
      status.dataset.tone = "info";
      status.textContent = COPY.notBuilt;
      setText("[data-download-generated]", COPY.notBuiltShort);
      setText("[data-download-primary-note]", COPY.notBuiltNote);
      renderFileList([]);
      return;
    }

    status.dataset.tone = "info";
    status.textContent = `${COPY.builtSummaryPrefix}${item.totalFiles}${COPY.builtSummarySuffix}`;
    setText(
      "[data-download-generated]",
      item.generatedAt ? new Date(item.generatedAt).toLocaleString() : COPY.builtJustNow
    );

    const primary = Array.isArray(item.items) ? item.items[0] : null;
    if (primary?.downloadUrl) {
      setLink("[data-download-primary]", primary.downloadUrl, COPY.primaryDownload);
      setText("[data-download-primary-note]", primary.file);
    }

    renderFileList(Array.isArray(item.items) ? item.items : []);
  } catch (error) {
    status.dataset.tone = "error";
    status.textContent = String(error?.message || error);
  }
}

initDownloadPage();
