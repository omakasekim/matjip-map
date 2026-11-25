import React, { useState } from 'react';
import {
  MapPin,
  Heart,
  Navigation,
  ExternalLink,
  Copy,
  Check,
  Map as MapIcon,
  ArrowUpDown,
} from 'lucide-react';
import { Place, getCategoryMeta } from '../types';
import {
  formatMenuSummary,
  formatPrice,
  getKakaoMapUrl,
  getNaverMapUrl,
  haversineKm,
} from '../utils/format';

export type SortKey = 'default' | 'name' | 'menus' | 'distance';

interface FullListViewProps {
  places: Place[];
  favorites: Set<number>;
  userLocation: { lat: number; lng: number } | null;
  sortBy: SortKey;
  onSortChange: (sort: SortKey) => void;
  onToggleFavorite: (id: number) => void;
  onViewOnMap: (place: Place) => void;
  onResetFilters: () => void;
}

const LIST_PAGE_SIZE = 60;

export const FullListView: React.FC<FullListViewProps> = ({
  places,
  favorites,
  userLocation,
  sortBy,
  onSortChange,
  onToggleFavorite,
  onViewOnMap,
  onResetFilters,
}) => {
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopyAddress = async (p: Place) => {
    try {
      await navigator.clipboard.writeText(p.a);
      setCopiedId(p.i);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#070B14] px-4 sm:px-6 pb-16 pt-16 lg:pt-16">
      <div className="max-w-6xl mx-auto">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
          <div>
            <h2 className="text-lg font-extrabold text-white">전체 리스트 보기</h2>
            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
              검색 결과 <span className="text-cyan-400 font-bold">{places.length.toLocaleString('ko-KR')}곳</span> · 카드를 누르면 지도 위치로 이동합니다
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortKey)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="default">기본 추천순</option>
              <option value="name">식당 이름순 (가나다)</option>
              <option value="menus">메뉴 많은 순</option>
              {userLocation && <option value="distance">내 주변 거리순</option>}
            </select>
          </div>
        </div>

        {places.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <p className="text-slate-300 font-semibold">조건에 맞는 맛집이 없습니다.</p>
            <button
              onClick={onResetFilters}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold"
            >
              필터 초기화
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {places.slice(0, visibleCount).map((p) => {
                const meta = getCategoryMeta(p.mc);
                const isFav = favorites.has(p.i);
                const dist = userLocation
                  ? haversineKm(userLocation.lat, userLocation.lng, p.lat, p.lng)
                  : null;

                return (
                  <div
                    key={p.i}
                    className="group bg-slate-900/85 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 flex flex-col justify-between transition shadow-sm"
                  >
                    <div>
                      {/* Badges row */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${meta.badge}`}>
                            <span>{meta.emoji}</span>
                            <span>{p.c}</span>
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/80">
                            {p.sr}
                          </span>
                          {dist !== null && (
                            <span className="text-[11px] font-bold text-cyan-300 tabular-nums">
                              {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => onToggleFavorite(p.i)}
                          className={`p-1.5 rounded-lg border transition shrink-0 ${
                            isFav
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                              : 'bg-slate-800/70 border-slate-700/80 text-slate-400 hover:text-rose-400'
                          }`}
                          title="즐겨찾기"
                        >
                          <Heart className="w-3.5 h-3.5" fill={isFav ? 'currentColor' : 'none'} />
                        </button>
                      </div>

                      {/* Restaurant Name */}
                      <h3 className="text-base font-extrabold text-white tracking-tight">{p.n}</h3>

                      {/* Menu summary + top priced chips */}
                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed line-clamp-2">
                        {formatMenuSummary(p, 4)}
                      </p>

                      {p.m.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.m.slice(0, 3).map((m, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-slate-950/80 border border-slate-800 text-slate-300"
                            >
                              {m.n}
                              {m.p ? <span className="text-cyan-400 ml-1 tabular-nums">{formatPrice(m.p)}</span> : null}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Address */}
                      <div className="mt-2.5 flex items-center justify-between gap-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1 min-w-0 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{p.a}</span>
                        </span>
                        <button
                          onClick={() => handleCopyAddress(p)}
                          className="shrink-0 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="주소 복사"
                        >
                          {copiedId === p.i ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Footer actions */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => onViewOnMap(p)}
                        className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition"
                      >
                        <MapIcon className="w-3 h-3" />
                        <span>지도 보기</span>
                      </button>
                      <a
                        href={getNaverMapUrl(p)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#03C75A]/15 hover:bg-[#03C75A]/25 text-[#22e577] border border-[#03C75A]/30 text-[11px] font-bold transition"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>네이버</span>
                      </a>
                      <a
                        href={getKakaoMapUrl(p)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#FEE500]/15 hover:bg-[#FEE500]/25 text-[#FEE500] border border-[#FEE500]/30 text-[11px] font-bold transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>카카오</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {visibleCount < places.length && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setVisibleCount((c) => c + LIST_PAGE_SIZE)}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-100 transition"
                >
                  더 불러오기 ({Math.min(visibleCount, places.length).toLocaleString('ko-KR')} /{' '}
                  {places.length.toLocaleString('ko-KR')})
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
