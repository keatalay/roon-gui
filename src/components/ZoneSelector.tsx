import { useCallback, useEffect, useRef, useState } from "react";
import type { ZoneListEntry } from "../types/roon";

interface Props {
  zones: ZoneListEntry[];
  visible: boolean;
  onSelect: (endpointType: string, endpointId: string) => void;
  onDelete: (name: string) => void;
  onClose: () => void;
}

export function ZoneSelector({
  zones,
  visible,
  onSelect,
  onDelete,
  onClose,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) {
      setSelectedIndex(0);
      dialogRef.current?.focus();
    }
  }, [visible]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(0, i - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(zones.length - 1, i + 1));
          break;
        case "Enter": {
          const zone = zones[selectedIndex];
          if (zone) {
            onSelect(zone.endpoint.type, zone.endpoint.id);
          }
          break;
        }
        case "Delete": {
          const zone = zones[selectedIndex];
          if (zone && zone.endpoint.type === "Preset") {
            onDelete(zone.name);
          }
          break;
        }
        case "Escape":
          onClose();
          break;
      }
    },
    [zones, selectedIndex, onSelect, onDelete, onClose]
  );

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        ref={dialogRef}
        className="bg-zinc-900 border border-roon rounded-xl shadow-2xl w-96 max-h-[60vh] flex flex-col outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className="px-4 py-3 border-b border-zinc-800 font-bold text-roon">
          Zones
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {zones.map((zone, index) => {
            const label =
              zone.endpoint.type === "Preset"
                ? `[${zone.name}]`
                : zone.endpoint.type === "Output"
                  ? `<${zone.name}>`
                  : zone.name;

            return (
              <div
                key={`${zone.endpoint.type}-${zone.endpoint.id}`}
                className={`px-4 py-2.5 cursor-pointer transition-colors text-sm ${
                  index === selectedIndex
                    ? "bg-roon text-white font-semibold"
                    : "hover:bg-zinc-800"
                }`}
                onClick={() => onSelect(zone.endpoint.type, zone.endpoint.id)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {label}
              </div>
            );
          })}
          {zones.length === 0 && (
            <div className="p-6 text-center text-zinc-600 text-sm">
              No zones available
            </div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-zinc-800 text-xs text-zinc-500">
          Enter: Select · Esc: Cancel · Delete: Remove preset
        </div>
      </div>
    </div>
  );
}
