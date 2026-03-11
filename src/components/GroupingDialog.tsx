import { useCallback, useEffect, useRef, useState } from "react";
import type { GroupingEntry, ZonePayload } from "../types/roon";

interface Props {
  grouping: GroupingEntry[] | null;
  visible: boolean;
  zone: ZonePayload | null;
  matchedPreset: string | null;
  matchedDraftPreset: string | null;
  onGrouped: (outputIds: string[]) => void;
  onSavePreset: (name: string, outputIds: string[]) => void;
  onMatchPreset: (outputIds: string[]) => void;
  onClose: () => void;
}

export function GroupingDialog({
  grouping,
  visible,
  zone,
  matchedPreset,
  matchedDraftPreset,
  onGrouped,
  onSavePreset,
  onMatchPreset,
  onClose,
}: Props) {
  const [items, setItems] = useState<GroupingEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [presetMode, setPresetMode] = useState(false);
  const [presetName, setPresetName] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (grouping) {
      setItems(grouping.map((g) => ({ ...g })));
      setSelectedIndex(0);
      setPresetMode(false);
      setPresetName("");
    }
  }, [grouping]);

  useEffect(() => {
    if (visible) dialogRef.current?.focus();
  }, [visible]);

  const getIncludedIds = useCallback(() => {
    return items.filter((i) => i.included).map((i) => i.output_id);
  }, [items]);

  const toggleItem = useCallback(
    (index: number) => {
      setItems((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], included: !next[index].included };
        const ids = next.filter((i) => i.included).map((i) => i.output_id);
        if (ids.length > 1) onMatchPreset(ids);
        return next;
      });
    },
    [onMatchPreset]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (presetMode) return;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(0, i - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(items.length - 1, i + 1));
          break;
        case " ":
          e.preventDefault();
          toggleItem(selectedIndex);
          break;
        case "Enter": {
          const ids = getIncludedIds();
          if (ids.length > 0) {
            if (presetName) {
              onSavePreset(presetName, ids);
            } else {
              onGrouped(ids);
            }
          }
          onClose();
          break;
        }
        case "s": {
          const ids = getIncludedIds();
          if (ids.length > 1) {
            setPresetMode(true);
            setPresetName(matchedDraftPreset || matchedPreset || "");
          }
          break;
        }
        case "Escape":
          onClose();
          break;
      }
    },
    [
      items,
      selectedIndex,
      presetMode,
      presetName,
      matchedPreset,
      matchedDraftPreset,
      toggleItem,
      getIncludedIds,
      onGrouped,
      onSavePreset,
      onClose,
    ]
  );

  if (!visible || !grouping) return null;

  const includedIds = getIncludedIds();
  const zoneName =
    includedIds.length <= 1
      ? zone?.display_name || ""
      : presetName || matchedDraftPreset || matchedPreset || zone?.display_name || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        ref={dialogRef}
        className="bg-zinc-900 border border-roon rounded-xl shadow-2xl w-96 max-h-[60vh] flex flex-col outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className="px-4 py-3 border-b border-zinc-800">
          {presetMode ? (
            <input
              type="text"
              autoFocus
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  setPresetMode(false);
                  setSelectedIndex(0);
                }
                if (e.key === "Escape") {
                  setPresetMode(false);
                  setPresetName("");
                  setSelectedIndex(0);
                }
              }}
              placeholder="Preset name..."
              className="w-full bg-zinc-800 border border-roon rounded px-3 py-1.5 text-white text-sm outline-none focus:ring-1 focus:ring-roon"
            />
          ) : (
            <span className="font-bold text-white">{zoneName}</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {items.map((item, index) => (
            <div
              key={item.output_id}
              className={`px-4 py-2.5 cursor-pointer transition-colors text-sm flex items-center gap-3 ${
                index === selectedIndex && !presetMode
                  ? "bg-roon text-white font-semibold"
                  : "hover:bg-zinc-800"
              }`}
              onClick={() => {
                setSelectedIndex(index);
                toggleItem(index);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className={item.included ? "text-roon" : "text-zinc-600"}>
                {item.included ? "✓" : "○"}
              </span>
              <span>{item.name}</span>
            </div>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-zinc-800 text-xs text-zinc-500">
          Space: Toggle · Enter: Apply · S: Save preset · Esc: Cancel
        </div>
      </div>
    </div>
  );
}
