"use client";

import { useId, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { formatTurkeyLocation, normalizeLocation, turkeyLocations } from "@/lib/turkey-locations";

type Props = { label: string; value?: string; placeholder?: string; disabled: boolean; locale: Locale; onCommit: (value: string) => void };

export function LocationField({ label, value, placeholder, disabled, locale, onCommit }: Props) {
  const listId = useId();
  const sourceValue = value ?? "";
  const [draft, setDraft] = useState({ source: sourceValue, query: sourceValue });
  const query = draft.source === sourceValue ? draft.query : sourceValue;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = useMemo(() => {
    const search = normalizeLocation(query);
    if (search.length < 2 || normalizeLocation(value ?? "") === search) return [];
    const tokens = search.split(" ");
    return turkeyLocations
      .map((location) => {
        const name = normalizeLocation(location.name);
        const province = normalizeLocation(location.province);
        if (!tokens.every((token) => `${name} ${province}`.includes(token))) return null;
        const score = name === search ? 0 : name.startsWith(search) ? 1 : province === search && location.level === "province" ? 2 : province.startsWith(search) ? 3 : 4;
        return { location, score };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => a.score - b.score || a.location.name.localeCompare(b.location.name, "tr"))
      .slice(0, 7)
      .map(({ location }) => location);
  }, [query, value]);

  const choose = (index: number) => {
    const location = suggestions[index];
    if (!location) return;
    const next = formatTurkeyLocation(location);
    setDraft({ source: sourceValue, query: next });
    setOpen(false);
    setActiveIndex(-1);
    onCommit(next);
  };

  return (
    <label className="field location-field">
      <span>{label}</span>
      <div className="location-input-shell">
        <MapPin size={15} aria-hidden="true" />
        <input
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          autoComplete="off"
          onChange={(event) => { setDraft({ source: sourceValue, query: event.target.value }); setOpen(true); setActiveIndex(-1); }}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          onBlur={() => { setOpen(false); onCommit(query.trim()); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && suggestions.length) { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1)); }
            else if (event.key === "ArrowUp" && suggestions.length) { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
            else if (event.key === "Enter" && activeIndex >= 0) { event.preventDefault(); choose(activeIndex); }
            else if (event.key === "Escape") setOpen(false);
          }}
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="location-suggestions" id={listId} role="listbox">
          {suggestions.map((location, index) => (
            <button id={`${listId}-${index}`} key={`${location.level}-${location.province}-${location.name}`} type="button" role="option" aria-selected={index === activeIndex} className={index === activeIndex ? "active" : ""} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(index)}>
              <span><strong>{location.name}</strong>{location.level === "district" && <small>{location.province}</small>}</span>
              <em>{locale === "tr" ? (location.level === "province" ? "İl" : "İlçe") : (location.level === "province" ? "Province" : "District")}</em>
            </button>
          ))}
        </div>
      )}
    </label>
  );
}
