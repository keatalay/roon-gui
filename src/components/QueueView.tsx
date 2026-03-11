import { useCallback, useEffect, useRef, useState } from "react";
import type { QueueItemPayload } from "../types/roon";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface Props {
  items: QueueItemPayload[];
  queueMode: string | null;
  queueTimeRemaining: number;
  isActive: boolean;
  onSelect: (queueItemId: number) => void;
  onActivate: () => void;
}

export function QueueView({
  items,
  queueMode,
  queueTimeRemaining,
  isActive,
  onSelect,
  onActivate,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedIndex >= items.length && items.length > 0) {
      setSelectedIndex(items.length - 1);
    }
  }, [items, selectedIndex]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = listRef.current?.children[index] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => {
            const next = Math.max(0, i - 1);
            scrollToIndex(next);
            return next;
          });
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => {
            const next = Math.min(items.length - 1, i + 1);
            scrollToIndex(next);
            return next;
          });
          break;
        case "Enter": {
          const item = items[selectedIndex];
          if (item) onSelect(item.queue_item_id);
          break;
        }
        case "Home":
          setSelectedIndex(0);
          scrollToIndex(0);
          break;
        case "End":
          setSelectedIndex(items.length - 1);
          scrollToIndex(items.length - 1);
          break;
      }
    },
    [items, selectedIndex, onSelect, scrollToIndex]
  );

  const borderColor = isActive ? "border-roon" : "border-zinc-700";
  const titleColor = isActive ? "text-white font-bold" : "text-zinc-500";

  const statusText = isActive && items.length > 0
    ? `${selectedIndex + 1}/${items.length}`
    : queueTimeRemaining > 0
      ? formatTime(queueTimeRemaining)
      : null;

  return (
    <div
      className={`flex flex-col border ${borderColor} rounded-lg overflow-hidden h-full`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onFocus={onActivate}
    >
      <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
        <span className="text-zinc-500 text-sm">{statusText}</span>
        <span className={titleColor}>Queue</span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto min-h-0">
        {items.map((item, index) => (
          <div
            key={`${item.queue_item_id}`}
            className={`px-4 py-2 cursor-pointer transition-colors ${
              index === selectedIndex && isActive
                ? "bg-roon/90 text-white"
                : index === selectedIndex
                  ? "bg-zinc-800 text-white"
                  : "hover:bg-zinc-800/50"
            }`}
            onClick={() => {
              setSelectedIndex(index);
              onSelect(item.queue_item_id);
            }}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="flex items-center justify-between text-sm leading-snug">
              <span className="truncate mr-3">{item.line1}</span>
              <span className="text-zinc-400 text-xs flex-shrink-0">
                {formatTime(item.length)}
              </span>
            </div>
            {item.line2 && (
              <div className="text-xs text-zinc-400 italic mt-0.5 pl-2 truncate">
                {item.line2}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="p-8 text-center text-zinc-600">Queue is empty</div>
        )}
      </div>

      {queueMode && (
        <div className="px-4 py-1.5 border-t border-zinc-800 text-xs text-zinc-400 flex-shrink-0">
          {queueMode}
        </div>
      )}
    </div>
  );
}
