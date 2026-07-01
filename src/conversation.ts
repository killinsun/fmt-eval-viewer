function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatConversationHtml(log: string): string {
  return log
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("ユーザー:")) {
        const text = trimmed.slice("ユーザー:".length).trim();
        return `<div class="turn user"><span class="role">ユーザー</span><span class="text">${escapeHtml(text)}</span></div>`;
      }
      if (trimmed.startsWith("AI:")) {
        const text = trimmed.slice("AI:".length).trim();
        return `<div class="turn ai"><span class="role">AI</span><span class="text">${escapeHtml(text)}</span></div>`;
      }
      return `<div class="turn other">${escapeHtml(trimmed)}</div>`;
    })
    .filter(Boolean)
    .join("");
}
