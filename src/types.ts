export interface MenuItem {
  n: string;
  p?: number;
}

export interface Place {
  i: number;       // ID
  n: string;       // Name
  c: string;       // Raw category
  mc: string;      // Macro category
  r: string;       // Region
  sr: string;      // Subregion
  a: string;       // Address
  lat: number;     // Latitude
  lng: number;     // Longitude
  m: MenuItem[];   // Top menus (up to 12)
  mt: number;      // Total menu count
}

export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export type BasemapStyle = 'dark' | 'voyager' | 'osm';

export const REGIONS = [
  '전체',
  '서울',
  '경기·인천',
  '경상·부산·대구·울산',
  '전라·광주',
  '충청·대전·세종',
  '강원',
  '제주',
] as const;

export const MACRO_CATEGORIES = [
  '전체',
  '고기·구이',
  '한식',
  '해물·회',
  '일식·초밥',
  '국밥·탕·찜',
  '중식',
  '면·만두',
  '분식',
  '치킨·주점',
  '양식·세계음식',
  '카페·디저트',
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
