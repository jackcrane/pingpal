const escapeHtml = (value = "") =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapeAttribute = (value = "") =>
  escapeHtml(value)
    .replace(/`/g, "&#96;")
    .replace(/\\/g, "&#92;");

export const formatDescription = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed.length) return "";

  let output = escapeHtml(trimmed);

  output = output.replace(
    /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g,
    (_match, label, href) => {
      const safeHref = escapeAttribute(href);
      const isExternal =
        href.startsWith("http://") ||
        href.startsWith("https://");
      const attrs = isExternal
        ? ' target="_blank" rel="noopener noreferrer"'
        : "";
      return `<a href="${safeHref}"${attrs}>${label}</a>`;
    }
  );

  output = output.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/__([\s\S]+?)__/g, "<u>$1</u>");

  output = output.replace(
    /(^|[^*])\*(?!\*)([\s\S]+?)\*(?!\*)/g,
    (_match, prefix, content) => `${prefix}<em>${content}</em>`
  );

  output = output.replace(
    /(^|[^_])_(?!_)([\s\S]+?)_(?!_)/g,
    (_match, prefix, content) => `${prefix}<em>${content}</em>`
  );

  return output;
};
