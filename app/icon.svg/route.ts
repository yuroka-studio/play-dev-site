import { accentVars } from "@/lib/color";
import { site } from "@/lib/config";

export const dynamic = "force-static";

const escapeXml = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A favicon drawn from the config: the studio's initial on the accent colour. No image files to replace. */
export function GET() {
  const { accent, onAccent } = accentVars(site.accentColor);
  const initial = escapeXml(Array.from(site.studioName.trim())[0]?.toUpperCase() ?? "?");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${accent}"/><text x="32" y="44" text-anchor="middle" font-family="system-ui, sans-serif" font-size="36" font-weight="700" fill="${onAccent}">${initial}</text></svg>\n`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
}
