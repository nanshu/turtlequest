export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Formats safe inline markdown-style `code` and **bold** spans after HTML-escaping.
 */
export function formatInlineText(str) {
  let html = escapeHtml(str);
  let tokenPrefix = "\uE000TQCODE";
  while (html.includes(tokenPrefix)) tokenPrefix += "_";
  const codeTokens = [];
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    const id = codeTokens.length;
    codeTokens.push(`<code class="inline-code">${code}</code>`);
    return `${tokenPrefix}${id}\uE001`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*<]+)\*/g, "<em>$1</em>");
  html = html.replace(/\n/g, "<br />");
  html = html.replace(
    new RegExp(`${tokenPrefix}(\\d+)\uE001`, "g"),
    (_, i) => codeTokens[Number(i)]
  );
  return html;
}
