export type CountryCode = 'KR' | 'JP' | 'HK' | 'TW';
export type CountryFilter = 'ALL' | CountryCode;
export type BadgeFilter = 'ALL' | 'TABELOG' | 'MICHELIN' | 'MYMAP' | 'LOCAL';

export interface MenuItem {
  n: string;
  p?: number;
}

export interface Place {
  i: number;         // ID
  co: CountryCode;   // Country
  n: string;         // Name
  c: string;         // Raw category / cuisine
  mc: string;        // Macro category
  r: string;         // Region
  sr: string;        // Subregion
  a: string;         // Address
  lat: number;       // Latitude
  lng: number;       // Longitude
  m?: MenuItem[];    // Top menus
  mt?: number;       // Total menu count
  b?: string;        // Prestige / rating badge (Tabelog, Michelin, etc.)
  u?: string;        // External URL (e.g. Tabelog page)
}

export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export type BasemapStyle = 'osm' | 'dark' | 'voyager';

export interface CountryInfo {
  code: CountryFilter;
  flag: string;
  label: string;
  center: [number, number];
  zoom: number;
}

export const COUNTRIES: CountryInfo[] = [
  { code: 'ALL', flag: '🌏', label: '전체', center: [31.8, 129.5], zoom: 5 },
  { code: 'KR', flag: '🇰🇷', label: '대한민국', center: [36.45, 127.85], zoom: 7 },
  { code: 'JP', flag: '🇯🇵', label: '일본', center: [36.2, 138.0], zoom: 6 },
  { code: 'HK', flag: '🇭🇰', label: '홍콩', center: [22.302, 114.172], zoom: 12 },
  { code: 'TW', flag: '🇹🇼', label: '대만', center: [23.85, 121.0], zoom: 7 },
];

export const COUNTRY_BY_CODE: Record<CountryFilter, CountryInfo> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c]),
) as Record<CountryFilter, CountryInfo>;

export const BADGE_FILTERS: { id: BadgeFilter; label: string }[] = [
  { id: 'ALL', label: '전체 등급' },
  { id: 'TABELOG', label: '🏆 타베로그 백명점·4.0+' },
  { id: 'MICHELIN', label: '⭐ 미슐랭 가이드' },
  { id: 'MYMAP', label: '📌 도쿄·오사카 추천' },
  { id: 'LOCAL', label: '🔥 홍콩·대만 로컬 명소' },
];

export const MACRO_CATEGORIES = [
  '전체',
  '한식',
  '일식·초밥',
  '중식',
  '고기·구이',
  '면·만두',
  '해물·회',
  '국밥·탕·찜',
  '분식',
  '양식·세계음식',
  '카페·디저트',
  '치킨·주점',
  '기타',
] as const;

export const CATEGORY_META: Record<string, { color: string; emoji: string; badge: string }> = {
  '고기·구이': { color: '#ef4444', emoji: '🥩', badge: 'bg-red-500/15 text-red-400 border-red-500/30' },
  '한식': { color: '#f97316', emoji: '🍚', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  '해물·회': { color: '#06b6d4', emoji: '🐟', badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  '일식·초밥': { color: '#ec4899', emoji: '🍣', badge: 'bg-pink-500/15 text-pink-400 border-pink-500/30' },
  '국밥·탕·찜': { color: '#eab308', emoji: '🍲', badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  '중식': { color: '#dc2626', emoji: '🥟', badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  '면·만두': { color: '#14b8a6', emoji: '🍜', badge: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  '분식': { color: '#f59e0b', emoji: '🍢', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  '치킨·주점': { color: '#a855f7', emoji: '🍗', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  '양식·세계음식': { color: '#3b82f6', emoji: '🍝', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  '카페·디저트': { color: '#d946ef', emoji: '☕', badge: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30' },
  '기타': { color: '#64748b', emoji: '📍', badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
};

export function getCategoryMeta(mc: string) {
  return CATEGORY_META[mc] ?? CATEGORY_META['기타'];
}
