export function renderGraphIconView(name = "") {
  const key = String(name || "").trim().toLowerCase();
  if (key === "close") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M5.5 5.5L14.5 14.5"></path>
        <path d="M14.5 5.5L5.5 14.5"></path>
      </svg>
    `;
  }
  if (key === "collapse") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M7.5 4.5H4.5V7.5M4.8 4.8L8.2 8.2M12.5 15.5H15.5V12.5M15.2 15.2L11.8 11.8"></path>
      </svg>
    `;
  }
  if (key === "expand") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M8 4.5H4.5V8M4.8 4.8L8.2 8.2M12 15.5H15.5V12M15.2 15.2L11.8 11.8"></path>
      </svg>
    `;
  }
  if (key === "read") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M10 4.5V15.5M4.5 10H15.5"></path>
      </svg>
    `;
  }
  if (key === "detail") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <circle cx="10" cy="10" r="4.2"></circle>
        <path d="M10 2.8V4.2M10 15.8V17.2M2.8 10H4.2M15.8 10H17.2"></path>
      </svg>
    `;
  }
  if (key === "zoom-out") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <circle cx="8.5" cy="8.5" r="4.6"></circle>
        <path d="M6.2 8.5H10.8"></path>
        <path d="M12.3 12.3L15.4 15.4"></path>
      </svg>
    `;
  }
  if (key === "zoom-in") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <circle cx="8.5" cy="8.5" r="4.6"></circle>
        <path d="M8.5 6.2V10.8M6.2 8.5H10.8"></path>
        <path d="M12.3 12.3L15.4 15.4"></path>
      </svg>
    `;
  }
  if (key === "drag") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <circle cx="6" cy="5.5" r="1"></circle>
        <circle cx="10" cy="5.5" r="1"></circle>
        <circle cx="14" cy="5.5" r="1"></circle>
        <circle cx="6" cy="10" r="1"></circle>
        <circle cx="10" cy="10" r="1"></circle>
        <circle cx="14" cy="10" r="1"></circle>
        <circle cx="6" cy="14.5" r="1"></circle>
        <circle cx="10" cy="14.5" r="1"></circle>
        <circle cx="14" cy="14.5" r="1"></circle>
      </svg>
    `;
  }
  if (key === "hand") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M6.2 9.7V6.1C6.2 5.3 6.8 4.8 7.5 4.8C8.2 4.8 8.8 5.3 8.8 6.1V9.2"></path>
        <path d="M8.8 8.6V4.8C8.8 4 9.4 3.5 10.1 3.5C10.8 3.5 11.4 4 11.4 4.8V9.1"></path>
        <path d="M11.4 8.7V5.8C11.4 5.1 12 4.6 12.7 4.6C13.4 4.6 14 5.1 14 5.8V10"></path>
        <path d="M14 9.4V7.6C14 6.9 14.6 6.4 15.2 6.4C15.9 6.4 16.4 6.9 16.4 7.6V11.2C16.4 14.2 14.2 16.5 11.2 16.5H9.8C8.2 16.5 7.1 15.9 6.2 14.8L4.1 12.2C3.6 11.6 3.7 10.8 4.3 10.4C4.9 10 5.6 10.1 6.1 10.6L7.2 11.7"></path>
      </svg>
    `;
  }
  if (key === "reset") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M5.2 8.2A5.6 5.6 0 1 1 6.4 14.7"></path>
        <path d="M5.2 4.8V8.4H8.8"></path>
      </svg>
    `;
  }
  if (key === "clue") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <circle cx="6" cy="6.5" r="2.2"></circle>
        <circle cx="14" cy="5" r="1.8"></circle>
        <circle cx="12.5" cy="14" r="2.4"></circle>
        <path d="M8.1 6.1L12.2 5.3M7.5 8.2L11 12.2"></path>
      </svg>
    `;
  }
  if (key === "question") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M6.2 6.9C6.7 4.8 8.3 3.8 10.3 3.8C12.4 3.8 14 5 14 6.8C14 8.3 13.2 9.1 11.6 10.1C10.5 10.8 10.1 11.3 10.1 12.5"></path>
        <path d="M10.1 15.4H10.2"></path>
        <circle cx="10" cy="10" r="8"></circle>
      </svg>
    `;
  }
  return `
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M5 10H15"></path>
      <path d="M7 6.5L5 10L7 13.5M13 6.5L15 10L13 13.5"></path>
    </svg>
  `;
}
