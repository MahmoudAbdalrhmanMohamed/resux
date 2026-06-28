import type { HalalCheckResult } from "../status.js";

export function formatBrowserOverlayScript(report: HalalCheckResult): string {
  if (report.status === "allowed") {
    return "";
  }

  const title = report.status === "blocked" ? "Resux Core Safety Block" : "Resux Core Review Required";
  const message = report.reasons.join("<br/>- ");
  const color = report.status === "blocked" ? "#EF4444" : "#F59E0B";

  return `
(function() {
  if (typeof window === 'undefined') return;
  const overlay = document.createElement('div');
  overlay.id = 'resux-halal-overlay';
  overlay.style.position = 'fixed';
  overlay.style.bottom = '20px';
  overlay.style.right = '20px';
  overlay.style.zIndex = '999999';
  overlay.style.backgroundColor = '#1E293B';
  overlay.style.color = '#F8FAFC';
  overlay.style.borderLeft = '6px solid ${color}';
  overlay.style.borderRadius = '8px';
  overlay.style.padding = '16px';
  overlay.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.5)';
  overlay.style.fontFamily = 'system-ui, sans-serif';
  overlay.style.fontSize = '14px';
  overlay.style.maxWidth = '380px';
  
  overlay.innerHTML = \`
    <div style="font-weight: bold; margin-bottom: 8px; font-size: 16px; color: ${color};">${title}</div>
    <div style="margin-bottom: 12px; opacity: 0.9;">
      This project has triggered framework-level safety alerts:<br/>
      <div style="margin-top: 6px; padding: 6px; background: #0F172A; border-radius: 4px; font-size: 12px; font-family: monospace; max-height: 120px; overflow-y: auto;">
        - ${message}
      </div>
    </div>
    <div style="font-size: 12px; opacity: 0.7;">Recommended Action: ${report.recommendedAction}</div>
  \`;
  document.body.appendChild(overlay);
})();
  `.trim();
}
