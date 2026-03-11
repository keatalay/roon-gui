import { useCallback, useEffect, useRef, useState } from "react";
import type { BrowseItem } from "../types/roon";

interface Props {
  title: string | null;
  items: BrowseItem[];
  isActive: boolean;
  onSelect: (itemKey: string | null) => void;
  onSelectWithInput: (input: string, itemKey: string | null) => void;
  onBack: () => void;
  onHome: () => void;
  onRefresh: () => void;
  onActivate: () => void;
}

export function BrowseView({
  title,
  items,
  isActive,
  onSelect,
  onSelectWithInput,
  onBack,
  onHome,
  onRefresh,
  onActivate,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [promptItem, setPromptItem] = useState<BrowseItem | null>(null);
  const [promptInput, setPromptInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIndex(0);
    listRef.current?.scrollTo(0, 0);
  }, [items]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = listRef.current?.children[index] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (promptItem) return;

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
          if (item) {
            if (item.input_prompt) {
              setPromptItem(item);
              setPromptInput("");
            } else {
              onSelect(item.item_key);
            }
          }
          break;
        }
        case "Escape":
          onBack();
          break;
        case "Home":
          if (e.ctrlKey) {
            onHome();
          } else {
            setSelectedIndex(0);
            scrollToIndex(0);
          }
          break;
        case "End":
          setSelectedIndex(items.length - 1);
          scrollToIndex(items.length - 1);
          break;
        case "F5":
          onRefresh();
          break;
      }
    },
    [items, selectedIndex, promptItem, onSelect, onBack, onHome, onRefresh, scrollToIndex]
  );

  const handlePromptSubmit = useCallback(() => {
    if (promptItem) {
      onSelectWithInput(promptInput, promptItem.item_key);
      setPromptItem(null);
      setPromptInput("");
    }
  }, [promptItem, promptInput, onSelectWithInput]);

  const borderColor = isActive ? "border-roon" : "border-zinc-700";
  const titleColor = isActive ? "text-white font-bold" : "text-zinc-500";

  return (
    <div
      className={`flex flex-col border ${borderColor} rounded-lg overflow-hidden h-full`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onFocus={onActivate}
    >
      <div
        className={`px-4 py-2 border-b border-zinc-800 flex items-center justify-between flex-shrink-0`}
      >
        <span className={titleColor}>{title || "Browse"}</span>
        {isActive && items.length > 0 && (
          <span className="text-zinc-500 text-sm">
            {selectedIndex + 1}/{items.length}
          </span>
        )}
      </div>

      {promptItem ? (
        <div className="p-4">
          <label className="block text-sm text-zinc-400 mb-2">
            {promptItem.input_prompt}
          </label>
          <input
            type="text"
            autoFocus
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") handlePromptSubmit();
              if (e.key === "Escape") {
                setPromptItem(null);
                setPromptInput("");
              }
            }}
            className="w-full bg-zinc-800 border border-roon rounded px-3 py-2 text-white outline-none focus:ring-1 focus:ring-roon"
          />
        </div>
      ) : (
        <div ref={listRef} className="flex-1 overflow-y-auto min-h-0">
          {items.map((item, index) => (
            <div
              key={`${item.item_key || item.title}-${index}`}
              className={`px-4 py-2 cursor-pointer transition-colors ${
                index === selectedIndex && isActive
                  ? "bg-roon/90 text-white"
                  : index === selectedIndex
                    ? "bg-zinc-800 text-white"
                    : "hover:bg-zinc-800/50"
              }`}
              onClick={() => {
                setSelectedIndex(index);
                if (item.input_prompt) {
                  setPromptItem(item);
                  setPromptInput("");
                } else {
                  onSelect(item.item_key);
                }
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="text-sm leading-snug">{item.title}</div>
              {item.subtitle && (
                <div className="text-xs text-zinc-400 italic mt-0.5 pl-2">
                  {item.subtitle}
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <div className="p-8 text-center text-zinc-600">
              {title ? "Loading..." : "Connecting to Roon..."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
