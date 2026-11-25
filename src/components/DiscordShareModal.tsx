import React, { useMemo, useState } from 'react';
import { X, Copy, Check, Download, MessageSquare } from 'lucide-react';
import { Place } from '../types';
import { buildDiscordChunks, buildMarkdownExport } from '../utils/format';

interface DiscordShareModalProps {
  places: Place[];
  filterLabel: string;
  onClose: () => void;
}

export const DiscordShareModal: React.FC<DiscordShareModalProps> = ({
  places,
  filterLabel,
  onClose,
}) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const chunks = useMemo(() => buildDiscordChunks(places, filterLabel, 1880), [places, filterLabel]);

  const handleCopyChunk = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1800);
    } catch {
      // ignore
    }
  };

  const handleDownloadMd = () => {
    const md = buildMarkdownExport(places, filterLabel);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matjip-${filterLabel.replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[82vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>디스코드 복붙 &amp; 마크다운 내보내기</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              현재 필터: <strong className="text-cyan-300">{filterLabel}</strong> · 총{' '}
              <strong>{places.length.toLocaleString('ko-KR')}곳</strong> ({chunks.length}개 블록 · 2,000자 자동 분할)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadMd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.md 다운로드</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-3">
          {chunks.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              현재 필터에 해당하는 식당이 없습니다.
            </div>
          ) : (
            chunks.slice(0, 30).map((chunk, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-3.5 py-2 bg-slate-800/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    블록 #{idx + 1} / {chunks.length}{' '}
                    <span className="text-slate-500">({chunk.length.toLocaleString()}자)</span>
                  </span>
                  <button
                    onClick={() => handleCopyChunk(chunk, idx)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                  >
                    {copiedIdx === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>복사됨!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>복사</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 text-xs text-slate-300 whitespace-pre-wrap break-words max-h-44 overflow-y-auto font-mono leading-relaxed">
                  {chunk}
                </pre>
              </div>
            ))
          )}
          {chunks.length > 30 && (
            <p className="text-xs text-amber-300 text-center py-2">
              표시 성능을 위해 상위 30개 블록만 미리 보여줍니다. 전체 {chunks.length}개 블록은 상단 <strong>.md 다운로드</strong> 버튼을 이용해 주세요!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
