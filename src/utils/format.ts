import { COUNTRY_BY_CODE, Place } from '../types';

export function formatPrice(price?: number): string {
  if (!price || price <= 0) return '';
  return `${price.toLocaleString('ko-KR')}원`;
}

export function formatMenuSummary(p: Place, limit = 4): string {
  const menus = p.m ?? [];
  if (menus.length === 0) return p.c;
  const top = menus.slice(0, limit).map((x) => x.n);
  const total = p.mt ?? menus.length;
  const rest = Math.max(0, total - top.length);
  const mstr = top.join(', ') + (rest > 0 ? ` 외 ${rest}종` : '');
  return `${p.c} (${mstr})`;
}

export function formatPlaceDiscordLine(p: Place): string {
  const badge = p.b ? ` [${p.b}]` : '';
  return `- **${p.n}**${badge} — ${formatMenuSummary(p, 4)} · \`${p.a}\``;
}

export function buildDiscordChunks(places: Place[], title: string, maxLen = 1880): string[] {
  if (places.length === 0) return [];
  const lines = places.map(formatPlaceDiscordLine);
  const chunks: string[][] = [];
  let cur: string[] = [];
  let curLen = 50;
  for (const line of lines) {
    if (cur.length > 0 && curLen + line.length + 1 > maxLen) {
      chunks.push(cur);
      cur = [line];
      curLen = 50 + line.length + 1;
    } else {
      cur.push(line);
      curLen += line.length + 1;
    }
  }
  if (cur.length > 0) chunks.push(cur);

  return chunks.map((ch, idx) => {
    const part = chunks.length > 1 ? ` (${idx + 1}/${chunks.length})` : '';
    return `## 📍 ${title}${part} · ${ch.length}곳\n${ch.join('\n')}`;
  });
}

export function buildMarkdownExport(places: Place[], title: string): string {
  const chunks = buildDiscordChunks(places, title, 1880);
  return `# 🍽️ ${title}\n\n총 **${places.length.toLocaleString('ko-KR')}곳** · **식당 이름** — 무슨 음식 파는지 · \`위치\`\n\n${chunks.join('\n\n---\n\n')}\n`;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getCountryLabel(co: Place['co']): string {
  const info = COUNTRY_BY_CODE[co];
  return info ? `${info.flag} ${info.label}` : co;
}

export function getNaverMapUrl(p: Place): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(`${p.n} ${p.a.split(' ').slice(0, 2).join(' ')}`)}`;
}

export function getKakaoMapUrl(p: Place): string {
  return `https://map.kakao.com/link/search/${encodeURIComponent(`${p.n} ${p.a.split(' ').slice(0, 2).join(' ')}`)}`;
}

export function getGoogleMapUrl(p: Place): string {
  const hasCoordOnlyAddr = p.a.includes('(') && p.a.includes(',');
  const q = hasCoordOnlyAddr ? `${p.n} ${p.r}` : `${p.n} ${p.a}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function getTabelogUrl(p: Place): string {
  if (p.u && p.u.includes('tabelog.com')) return p.u;
  return `https://tabelog.com/rstLst/?vs=1&sa=&sk=${encodeURIComponent(p.n)}`;
}
