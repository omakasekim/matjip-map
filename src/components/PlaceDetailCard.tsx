import React, { useState } from 'react';
import {
  X,
  MapPin,
  Copy,
  Check,
  Heart,
  ExternalLink,
  UtensilsCrossed,
  Share2,
  Navigation,
} from 'lucide-react';
import { Place, getCategoryMeta } from '../types';
import {
  formatPlaceDiscordLine,
  formatPrice,
  getGoogleMapUrl,
  getKakaoMapUrl,
  getNaverMapUrl,
} from '../utils/format';

interface PlaceDetailCardProps {
  place: Place;
  isFavorite: boolean;
  distanceKm: number | null;
  onToggleFavorite: (id: number) => void;
  onClose: () => void;
}

export const PlaceDetailCard: React.FC<PlaceDetailCardProps> = ({
  place,
  isFavorite,
  distanceKm,
  onToggleFavorite,
  onClose,
}) => {
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedDiscord, setCopiedDiscord] = useState(false);
  const meta = getCategoryMeta(place.mc);

  const copyText = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 1600);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div className="absolute bottom-4 right-4 left-4 md:left-auto md:w-[400px] z-[1000] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 animate-in fade-in">
      {/* Top accent bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: meta.color }} />

      <div className="p-4 max-h-[68vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${meta.badge}`}>
                <span>{meta.emoji}</span>
                <span>{place.c}</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {place.sr}
              </span>
              {distanceKm !== null && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium">
                  {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight leading-snug">{place.n}</h2>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onToggleFavorite(place.i)}
              title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 저장'}
              className={`p-2 rounded-xl border transition ${
                isFavorite
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-rose-400'
              }`}
            >
              <Heart className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={onClose}
              title="닫기"
              className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Address */}
        <div className="mt-3 flex items-start justify-between gap-2 bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
          <div className="flex items-start gap-2 text-sm text-slate-300 min-w-0">
            <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span className="break-keep">{place.a}</span>
          </div>
          <button
            onClick={() => copyText(place.a, setCopiedAddr)}
            className="shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            {copiedAddr ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedAddr ? '복사됨' : '복사'}</span>
          </button>
        </div>

        {/* Navigation external links */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <a
            href={getNaverMapUrl(place)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold bg-[#03C75A]/15 hover:bg-[#03C75A]/25 text-[#22e577] border border-[#03C75A]/30 transition"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>네이버 지도</span>
          </a>
          <a
            href={getKakaoMapUrl(place)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold bg-[#FEE500]/15 hover:bg-[#FEE500]/25 text-[#FEE500] border border-[#FEE500]/30 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>카카오맵</span>
          </a>
          <a
            href={getGoogleMapUrl(place)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>구글 지도</span>
          </a>
        </div>

        {/* Menus */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
              <span>주요 메뉴 {place.mt > 0 ? `(${place.mt}종)` : ''}</span>
            </h3>
            <button
              onClick={() => copyText(formatPlaceDiscordLine(place), setCopiedDiscord)}
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition"
            >
              {copiedDiscord ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedDiscord ? '복사 완료!' : '디스코드 복붙'}</span>
            </button>
          </div>

          {place.m.length > 0 ? (
            <div className="divide-y divide-slate-800/80 bg-slate-950/60 border border-slate-800 rounded-xl px-3">
              {place.m.map((item, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-200 truncate">{item.n}</span>
                  {item.p ? (
                    <span className="text-cyan-300 font-semibold tabular-nums shrink-0 text-xs">
                      {formatPrice(item.p)}
                    </span>
                  ) : null}
                </div>
              ))}
              {place.mt > place.m.length && (
                <div className="py-2 text-xs text-slate-500 text-center">
                  외 {place.mt - place.m.length}개 메뉴 더 있음
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 bg-slate-950/50 border border-slate-800 rounded-xl p-3">
              상세 메뉴 정보는 등록되어 있지 않습니다. ({place.c})
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
