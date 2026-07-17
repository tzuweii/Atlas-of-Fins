import { formatContentValidationErrors } from "../data/content-validation.js";

export function applyContentValidationGate(report, root = document) {
  if (report?.ok) return true;
  for (const id of ["continue-button", "new-game-button"]) {
    const button = root.getElementById(id);
    if (button) button.disabled = true;
  }
  const titleCopy = root.querySelector(".title-copy");
  if (titleCopy) titleCopy.textContent = "海圖資料需要整理，旅程已安全暫停。請由開發者模式查看資料來源。";
  console.error(`Atlas of Fins content validation failed:\n${formatContentValidationErrors(report)}`);
  return false;
}

export function renderContentValidationReport(report, modalRoot) {
  if (!modalRoot) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const modal = document.createElement("div");
  modal.className = "modal developer-modal";
  const label = document.createElement("span");
  label.className = "section-label";
  label.textContent = "內容安全檢查";
  const title = document.createElement("h2");
  title.textContent = "部分資料未能載入";
  const copy = document.createElement("p");
  copy.className = "modal-copy";
  copy.textContent = "遊戲已停止建立新旅程，避免錯誤內容損壞存檔。以下路徑可直接定位資料來源。";
  const details = document.createElement("pre");
  details.className = "content-validation-report";
  details.textContent = formatContentValidationErrors(report);
  const actions = document.createElement("div");
  actions.className = "modal-actions";
  const close = document.createElement("button");
  close.className = "soft-button";
  close.type = "button";
  close.dataset.action = "close-modal";
  close.textContent = "關閉";
  actions.append(close);
  modal.append(label, title, copy, details, actions);
  backdrop.append(modal);
  modalRoot.replaceChildren(backdrop);
}
