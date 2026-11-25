import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  Heart,
  Dices,
  LocateFixed,
  Maximize2,
  Share2,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  BookOpen,
  List,
  Map as MapIcon,
} from 'lucide-react';
import {
  BADGE_FILTERS,
  BadgeFilter,
  BasemapStyle,
  COUNTRIES,
  COUNTRY_BY_CODE,
  CountryFilter,
  MACRO_CATEGORIES,
  MapBounds,
  Place,
  getCategoryMeta,
} from './types';
import { CameraTarget, MapView } from './components/MapView';
import { PlaceDetailCard } from './components/PlaceDetailCard';
import { DiscordShareModal } from './components/DiscordShareModal';
import { FullListView, SortKey } from './components/FullListView';
import { formatMenuSummary, getCountryLabel, haversineKm } from './utils/format';

const FAV_STORAGE_KEY = 'matjip_map_favorites_v2';
const PAGE_SIZE = 60;
type ViewMode = 'map' | 'list';

function parseCountryParam(v: string | null): CountryFilter {
  if (v === 'KR' || v === 'JP' || v === 'HK' || v === 'TW' || v === 'ALL') return v;
  return 'ALL';
}

export function App() {
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [country, setCountry] = useState<CountryFilter>(() =>
    parseCountryParam(new URLSearchParams(window.location.search).get('country')),
  );
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
  const [region, setRegion] = useState(() => new URLSearchParams(window.location.search).get('region') || '전체');
  const [subregion, setSubregion] = useState(() => new URLSearchParams(window.location.search).get('sub') || '전체');
  const [macroCat, setMacroCat] = useState(() => new URLSearchParams(window.location.search).get('cat') || '전체');
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('ALL');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyInBounds, setOnlyInBounds] = useState(false);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    new URLSearchParams(window.location.search).get('view') === 'list' ? 'list' : 'map',
  );
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [basemap, setBasemap] = useState<BasemapStyle>('osm');
  const [fitTrigger, setFitTrigger] = useState(0);
  const [cameraTarget, setCameraTarget] = useState<CameraTarget | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [shareOpen, setShareOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // GPS
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // Favorites
  const [favorites, setFavorites] = useState<Set<number>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FAV_STORAGE_KEY) || '[]');
      return new Set(Array.isArray(saved) ? saved : []);
    } catch {
      return new Set();
    }
  });

  // Load dataset
  useEffect(() => {
    fetch('./places.json')
      .then((res) => {
        if (!res.ok) throw new Error(`데이터 로드 실패 (${res.status})`);
        return res.json();
      })
      .then((data: Place[]) => {
        setAllPlaces(data);
        const params = new URLSearchParams(window.location.search);
        const placeParam = params.get('place');
        if (placeParam) {
          const found = data.find((p) => String(p.i) === placeParam);
          if (found) setSelectedPlace(found);
        } else {
          const initCountry = parseCountryParam(params.get('country'));
          if (initCountry !== 'ALL') {
            const c = COUNTRY_BY_CODE[initCountry];
            setCameraTarget({ lat: c.center[0], lng: c.center[1], zoom: c.zoom, seq: Date.now() });
          }
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Sync URL query params cleanly
  useEffect(() => {
    const params = new URLSearchParams();
    if (country !== 'ALL') params.set('country', country);
    if (query.trim()) params.set('q', query.trim());
    if (region !== '전체') params.set('region', region);
    if (subregion !== '전체') params.set('sub', subregion);
    if (macroCat !== '전체') params.set('cat', macroCat);
    if (viewMode === 'list') params.set('view', 'list');
    if (selectedPlace) params.set('place', String(selectedPlace.i));
    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', nextUrl);
  }, [country, query, region, subregion, macroCat, viewMode, selectedPlace]);

  const toggleFavorite = useCallback((id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Country counts
  const countryCounts = useMemo(() => {
    const counts: Record<CountryFilter, number> = { ALL: allPlaces.length, KR: 0, JP: 0, HK: 0, TW: 0 };
    for (const p of allPlaces) counts[p.co] = (counts[p.co] || 0) + 1;
    return counts;
  }, [allPlaces]);

  // Dynamic regions for active country
  const availableRegions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of allPlaces) {
      if (country !== 'ALL' && p.co !== country) continue;
      counts.set(p.r, (counts.get(p.r) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [allPlaces, country]);

  // Dynamic subregions for active country + region
  const subregions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of allPlaces) {
      if (country !== 'ALL' && p.co !== country) continue;
      if (region !== '전체' && p.r !== region) continue;
      counts.set(p.sr, (counts.get(p.sr) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [allPlaces, country, region]);

  // Filtered places
  const filteredPlaces = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

    const out = allPlaces.filter((p) => {
      if (country !== 'ALL' && p.co !== country) return false;
      if (region !== '전체' && p.r !== region) return false;
      if (subregion !== '전체' && p.sr !== subregion) return false;
      if (macroCat !== '전체' && p.mc !== macroCat) return false;
      if (onlyFavorites && !favorites.has(p.i)) return false;

      if (badgeFilter !== 'ALL') {
        const b = p.b || '';
        if (badgeFilter === 'TABELOG' && !b.includes('타베로그')) return false;
        if (badgeFilter === 'MICHELIN' && !b.includes('미슐랭')) return false;
        if (badgeFilter === 'MYMAP' && !b.includes('추천')) return false;
        if (badgeFilter === 'LOCAL' && !b.includes('로컬 명소')) return false;
      }

      if (tokens.length > 0) {
        const menusTxt = p.m ? p.m.map((x) => x.n).join(' ') : '';
        const hay = `${p.n} ${p.c} ${p.mc} ${p.r} ${p.sr} ${p.a} ${p.b || ''} ${menusTxt}`.toLowerCase();
        for (const t of tokens) {
          if (!hay.includes(t)) return false;
        }
      }
      return true;
    });

    if (sortBy === 'name') {
      return [...out].sort((a, b) => a.n.localeCompare(b.n, 'ko'));
    }
    if (sortBy === 'menus') {
      return [...out].sort((a, b) => (b.mt ?? 0) - (a.mt ?? 0));
    }
    if ((sortBy === 'distance' || sortBy === 'default') && userLocation) {
      return [...out].sort(
        (a, b) =>
          haversineKm(userLocation.lat, userLocation.lng, a.lat, a.lng) -
          haversineKm(userLocation.lat, userLocation.lng, b.lat, b.lng),
      );
    }
    return out;
  }, [allPlaces, country, query, region, subregion, macroCat, badgeFilter, onlyFavorites, favorites, userLocation, sortBy]);

  const listPlaces = useMemo(() => {
    if (!onlyInBounds || !mapBounds) return filteredPlaces;
    return filteredPlaces.filter(
      (p) =>
        p.lat >= mapBounds.south &&
        p.lat <= mapBounds.north &&
        p.lng >= mapBounds.west &&
        p.lng <= mapBounds.east,
    );
  }, [filteredPlaces, onlyInBounds, mapBounds]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [country, query, region, subregion, macroCat, badgeFilter, onlyFavorites, onlyInBounds]);

  const handleCountryChange = (nextCountry: CountryFilter) => {
    setCountry(nextCountry);
    setRegion('전체');
    setSubregion('전체');
    setSelectedPlace(null);
    const info = COUNTRY_BY_CODE[nextCountry];
    setCameraTarget({ lat: info.center[0], lng: info.center[1], zoom: info.zoom, seq: Date.now() });
  };

  const handleRegionChange = (nextRegion: string) => {
    setRegion(nextRegion);
    setSubregion('전체');
    setTimeout(() => setFitTrigger((x) => x + 1), 30);
  };

  const handleSubregionChange = (nextSub: string) => {
    setSubregion(nextSub);
    setTimeout(() => setFitTrigger((x) => x + 1), 30);
  };

  const handleRandomPick = () => {
    const pool = listPlaces.length > 0 ? listPlaces : filteredPlaces;
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setSelectedPlace(pick);
    setViewMode('map');
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('이 브라우저에서는 위치 정보를 지원하지 않습니다.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        alert('현재 위치를 가져올 수 없습니다. 브라우저 위치 권한을 확인해 주세요.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const cycleBasemap = () => {
    setBasemap((prev) => (prev === 'osm' ? 'dark' : prev === 'dark' ? 'voyager' : 'osm'));
  };

  const basemapLabel = basemap === 'osm' ? '표준 지도' : basemap === 'dark' ? '다크 맵' : '클린 맵';

  const filterLabel = useMemo(() => {
    const parts: string[] = [];
    if (country !== 'ALL') {
      const c = COUNTRY_BY_CODE[country];
      parts.push(`${c.flag} ${c.label}`);
    }
    if (region !== '전체') parts.push(region);
    if (subregion !== '전체') parts.push(subregion);
    if (macroCat !== '전체') parts.push(macroCat);
    if (badgeFilter !== 'ALL') {
      const bf = BADGE_FILTERS.find((x) => x.id === badgeFilter);
      if (bf) parts.push(bf.label);
    }
    if (query.trim()) parts.push(`"${query.trim()}"`);
    if (onlyFavorites) parts.push('즐겨찾기');
    if (onlyInBounds) parts.push('지도 영역');
    return parts.length > 0 ? parts.join(' · ') : '아시아 맛집 지도 (한국·일본·홍콩·대만)';
  }, [country, region, subregion, macroCat, badgeFilter, query, onlyFavorites, onlyInBounds]);

  const resetAllFilters = () => {
    setCountry('ALL');
    setQuery('');
    setRegion('전체');
    setSubregion('전체');
    setMacroCat('전체');
    setBadgeFilter('ALL');
    setOnlyFavorites(false);
    setOnlyInBounds(false);
    const info = COUNTRY_BY_CODE['ALL'];
    setCameraTarget({ lat: info.center[0], lng: info.center[1], zoom: info.zoom, seq: Date.now() });
  };

  const selectedDistance = useMemo(() => {
    if (!selectedPlace || !userLocation) return null;
    return haversineKm(userLocation.lat, userLocation.lng, selectedPlace.lat, selectedPlace.lng);
  }, [selectedPlace, userLocation]);

  const hasAnyFilter =
    country !== 'ALL' ||
    Boolean(query) ||
    region !== '전체' ||
    subregion !== '전체' ||
    macroCat !== '전체' ||
    badgeFilter !== 'ALL' ||
    onlyFavorites ||
    onlyInBounds;

  return (
    <div className="relative h-screen w-screen flex overflow-hidden bg-[#070B14] text-slate-100">
      {/* Sidebar Drawer */}
      <aside
        className={`fixed md:relative top-0 left-0 z-[1100] h-full bg-[#0B1120]/96 backdrop-blur-xl border-r border-slate-800/90 flex flex-col transition-all duration-200 ${
          sidebarOpen ? 'w-[92vw] max-w-[400px] translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 overflow-hidden border-r-0'
        }`}
      >
        {/* Brand Header */}
        <div className="px-4 pt-3.5 pb-3 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-lg shadow-lg shadow-cyan-500/20 shrink-0">
                🍽️
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-extrabold tracking-tight text-white truncate">맛집 지도</h1>
                <p className="text-[11px] text-slate-400 tabular-nums">
                  4개국 {allPlaces.length.toLocaleString('ko-KR')}곳 · 표시{' '}
                  <span className="text-cyan-400 font-bold">{listPlaces.length.toLocaleString('ko-KR')}곳</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <a
                href="https://github.com/Aetherx86/matjip-map/blob/main/LIST.md"
                target="_blank"
                rel="noopener noreferrer"
                title="국가별 마크다운 리스트 보기"
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <BookOpen className="w-4 h-4" />
              </a>
              <button
                onClick={() => setSidebarOpen(false)}
                title="사이드바 접기"
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Country Selector Pills */}
          <div className="mt-3 grid grid-cols-5 gap-1">
            {COUNTRIES.map((c) => {
              const active = country === c.code;
              return (
                <button
                  key={c.code}
                  onClick={() => handleCountryChange(c.code)}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border text-[11px] font-bold transition ${
                    active
                      ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-sm'
                      : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <span className="text-sm leading-none">{c.flag}</span>
                  <span className="mt-1 truncate max-w-full">{c.label}</span>
                  <span className={`text-[9px] tabular-nums ${active ? 'text-cyan-300' : 'text-slate-500'}`}>
                    {(countryCounts[c.code] || 0).toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search input */}
          <div className="mt-2.5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setFitTrigger((x) => x + 1);
              }}
              placeholder="식당명, 메뉴, 지역 검색 (수원, 도쿄, 라멘, 딤섬...)"
              className="w-full pl-9 pr-16 py-2 rounded-xl bg-slate-950/90 border border-slate-700/80 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 text-slate-400 hover:text-white"
                  title="검색어 지우기"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`p-1.5 rounded-lg transition ${
                  showFilters ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
                }`}
                title="필터 열기/접기"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick action bar */}
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleRandomPick}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>랜덤 추천</span>
            </button>
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>디스코드 복붙</span>
            </button>
            <button
              onClick={() => setOnlyFavorites((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                onlyFavorites
                  ? 'bg-rose-500/25 text-rose-200 border-rose-500/50'
                  : 'bg-slate-800/70 text-slate-300 border-slate-700 hover:text-rose-300'
              }`}
            >
              <Heart className="w-3.5 h-3.5" fill={onlyFavorites ? 'currentColor' : 'none'} />
              <span>저장 ({favorites.size})</span>
            </button>
            <button
              onClick={() => setOnlyInBounds((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                onlyInBounds
                  ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50'
                  : 'bg-slate-800/70 text-slate-300 border-slate-700 hover:text-emerald-300'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>지도 내</span>
            </button>
          </div>
        </div>

        {/* Collapsible Filters */}
        {showFilters && (
          <div className="px-4 py-2.5 border-b border-slate-800/80 space-y-2 shrink-0 bg-slate-900/40">
            {/* Regions */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-400">지역</span>
                {hasAnyFilter && (
                  <button onClick={resetAllFilters} className="text-[11px] text-cyan-400 hover:underline">
                    전체 초기화
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => handleRegionChange('전체')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap border transition ${
                    region === '전체'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                      : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:border-slate-500'
                  }`}
                >
                  전체
                </button>
                {availableRegions.map(([r, cnt]) => (
                  <button
                    key={r}
                    onClick={() => handleRegionChange(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap border transition ${
                      region === r
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:border-slate-500'
                    }`}
                  >
                    {r} <span className="opacity-70 text-[10px]">({cnt})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subregion + Badge/Rating filter row */}
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={subregion}
                onChange={(e) => handleSubregionChange(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 truncate"
              >
                <option value="전체">세부 지역 전체 ({subregions.length})</option>
                {subregions.map(([sr, cnt]) => (
                  <option key={sr} value={sr}>
                    {sr} ({cnt})
                  </option>
                ))}
              </select>

              <select
                value={badgeFilter}
                onChange={(e) => setBadgeFilter(e.target.value as BadgeFilter)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 truncate"
              >
                {BADGE_FILTERS.map((bf) => (
                  <option key={bf.id} value={bf.id}>
                    {bf.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Food categories */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 block mb-1">음식 종류</span>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {MACRO_CATEGORIES.map((mc) => {
                  const meta = mc === '전체' ? null : getCategoryMeta(mc);
                  return (
                    <button
                      key={mc}
                      onClick={() => setMacroCat(mc)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap border transition flex items-center gap-1 ${
                        macroCat === mc
                          ? 'bg-blue-500 text-white border-blue-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:border-slate-500'
                      }`}
                    >
                      {meta && <span>{meta.emoji}</span>}
                      <span>{mc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Restaurant list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">4개국 맛집 데이터를 불러오는 중...</div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-rose-400">{error}</div>
          ) : listPlaces.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm text-slate-300 font-medium">조건에 맞는 맛집이 없습니다.</p>
              <button
                onClick={resetAllFilters}
                className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
              >
                전체 보기
              </button>
            </div>
          ) : (
            <>
              {listPlaces.slice(0, visibleCount).map((p) => {
                const meta = getCategoryMeta(p.mc);
                const isSelected = selectedPlace?.i === p.i;
                const isFav = favorites.has(p.i);
                const dist = userLocation
                  ? haversineKm(userLocation.lat, userLocation.lng, p.lat, p.lng)
                  : null;
                return (
                  <button
                    key={p.i}
                    onClick={() => {
                      setSelectedPlace(p);
                      if (viewMode === 'list') setViewMode('map');
                      if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 transition hover:bg-slate-800/60 ${
                      isSelected ? 'bg-cyan-500/15 border-l-2 border-l-cyan-400' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs shrink-0">{COUNTRY_BY_CODE[p.co]?.flag}</span>
                          <span className="text-sm font-bold text-white truncate">{p.n}</span>
                          {isFav && <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" fill="currentColor" />}
                        </div>
                        {p.b && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                            {p.b}
                          </span>
                        )}
                        <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                          <span className="mr-1">{meta.emoji}</span>
                          {formatMenuSummary(p, 3)}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {getCountryLabel(p.co)} · {p.a}
                        </p>
                      </div>
                      {dist !== null && (
                        <span className="shrink-0 text-[11px] font-semibold text-cyan-400 tabular-nums">
                          {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {visibleCount < listPlaces.length && (
                <div className="p-3 text-center">
                  <button
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
                  >
                    더 보기 ({Math.min(visibleCount, listPlaces.length).toLocaleString()} /{' '}
                    {listPlaces.length.toLocaleString('ko-KR')})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Main Map / Full List Area */}
      <main className="relative flex-1 h-full overflow-hidden">
        {/* Floating Top-Left Controls */}
        <div className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 text-slate-100 shadow-xl hover:bg-slate-800 transition text-xs font-bold"
            >
              <PanelLeftOpen className="w-4 h-4 text-cyan-400" />
              <span>검색/필터 ({listPlaces.length.toLocaleString('ko-KR')})</span>
            </button>
          )}

          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-xl">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                viewMode === 'map'
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>지도</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                viewMode === 'list'
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>전체 리스트</span>
            </button>
          </div>
        </div>

        {/* Floating Top-Right Map Controls */}
        <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5">
          <button
            onClick={handleLocateMe}
            disabled={locating}
            title="내 주변 맛집 거리순 정렬"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border shadow-lg backdrop-blur-md transition ${
              userLocation
                ? 'bg-blue-600/90 text-white border-blue-400'
                : 'bg-slate-900/92 text-slate-100 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <LocateFixed className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{locating ? '탐색 중...' : '내 주변'}</span>
          </button>

          {viewMode === 'map' && (
            <>
              <button
                onClick={() => setFitTrigger((x) => x + 1)}
                title="검색 결과 전체가 보이게 지도 맞추기"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900/92 text-slate-100 border border-slate-700 hover:bg-slate-800 shadow-lg backdrop-blur-md transition"
              >
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">전체 맞추기</span>
              </button>

              <button
                onClick={cycleBasemap}
                title="지도 스타일 전환 (표준 지도 / 다크 맵 / 클린 맵)"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900/92 text-slate-100 border border-slate-700 hover:bg-slate-800 shadow-lg backdrop-blur-md transition"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>{basemapLabel}</span>
              </button>
            </>
          )}
        </div>

        {/* Floating Live Filter Pill */}
        <div className="hidden xl:flex absolute top-3 left-1/2 -translate-x-1/2 z-[999] items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/88 backdrop-blur-md border border-slate-700/80 shadow-lg text-xs text-slate-200 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold">{filterLabel}</span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-300 font-bold tabular-nums">{listPlaces.length.toLocaleString('ko-KR')}곳</span>
        </div>

        {/* Keep MapView mounted */}
        <div className={viewMode === 'map' ? 'w-full h-full' : 'hidden'}>
          <MapView
            places={filteredPlaces}
            selectedPlace={selectedPlace}
            onSelectPlace={(p) => setSelectedPlace(p)}
            onBoundsChange={setMapBounds}
            basemap={basemap}
            fitTrigger={fitTrigger}
            cameraTarget={cameraTarget}
            userLocation={userLocation}
            visible={viewMode === 'map'}
          />
        </div>

        {/* Full List View */}
        {viewMode === 'list' && (
          <FullListView
            places={listPlaces}
            favorites={favorites}
            userLocation={userLocation}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onToggleFavorite={toggleFavorite}
            onViewOnMap={(p) => {
              setSelectedPlace(p);
              setViewMode('map');
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            onResetFilters={resetAllFilters}
          />
        )}

        {/* Selected Place Detail Card */}
        {viewMode === 'map' && selectedPlace && (
          <PlaceDetailCard
            place={selectedPlace}
            isFavorite={favorites.has(selectedPlace.i)}
            distanceKm={selectedDistance}
            onToggleFavorite={toggleFavorite}
            onClose={() => setSelectedPlace(null)}
          />
        )}
      </main>

      {/* Discord / Markdown Export Modal */}
      {shareOpen && (
        <DiscordShareModal
          places={listPlaces}
          filterLabel={filterLabel}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
