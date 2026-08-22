import { useEffect, useId, useRef, useState } from "react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  /** id of the visible field label; used for aria-labelledby */
  labelId?: string;
  /** fallback accessible name when there is no visible label */
  ariaLabel?: string;
  /** mark the trigger so an ancestor can move focus to it on open */
  autoFocus?: boolean;
}

// Accessible select-only dropdown (WAI-ARIA listbox pattern). Replaces the
// native <select> so the OPEN option list follows the house style — white
// surface, hairline border, floating shadow, blue-fill active row, checkmark
// on the selected item, orange keyboard focus. Full keyboard support: Up/Down,
// Home/End, Enter/Space, Escape, typeahead. Focus lives on the listbox while
// open (aria-activedescendant), and returns to the trigger on close.
export default function Dropdown({
  value,
  options,
  onChange,
  labelId,
  ariaLabel,
  autoFocus,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef<{ str: string; timer: number }>({ str: "", timer: 0 });

  const baseId = useId();
  const listId = `${baseId}-list`;
  const valId = `${baseId}-val`;
  const optId = (i: number) => `${baseId}-opt-${i}`;

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex] ?? options[0];

  const openList = () => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };
  const closeList = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) btnRef.current?.focus();
  };
  const choose = (i: number) => {
    const opt = options[i];
    if (opt) onChange(opt.value);
    closeList();
  };

  // On open: focus the listbox. Outside-click closes.
  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the active option in view during keyboard navigation.
  useEffect(() => {
    if (open) document.getElementById(optId(activeIndex))?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const runTypeahead = (key: string) => {
    if (typeahead.current.timer) window.clearTimeout(typeahead.current.timer);
    const str = (typeahead.current.str + key).toLowerCase();
    typeahead.current.str = str;
    typeahead.current.timer = window.setTimeout(() => {
      typeahead.current.str = "";
    }, 600);
    const n = options.length;
    for (let k = 0; k < n; k++) {
      const idx = (activeIndex + k) % n;
      if (options[idx].label.toLowerCase().startsWith(str)) {
        setActiveIndex(idx);
        break;
      }
    }
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  };

  const onListKey = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        // Stop the key from reaching an ancestor's document-level Escape handler
        // (e.g. the accessibility menu) — Escape here closes only THIS dropdown.
        e.stopPropagation();
        closeList();
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          e.preventDefault();
          runTypeahead(e.key);
        }
    }
  };

  // Close when focus leaves the whole widget (blur to an element outside the
  // root, or to nothing). Matches native <select> and guarantees at most one
  // dropdown is open at a time, including keyboard-driven opens.
  const onRootBlur = (e: React.FocusEvent) => {
    if (!rootRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
  };

  return (
    <div className={"dd" + (open ? " open" : "")} ref={rootRef} onBlur={onRootBlur}>
      <button
        type="button"
        ref={btnRef}
        className="dd-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={labelId ? `${labelId} ${valId}` : undefined}
        aria-label={labelId ? undefined : ariaLabel}
        data-autofocus={autoFocus ? "" : undefined}
        onClick={() => (open ? closeList(false) : openList())}
        onKeyDown={onTriggerKey}
      >
        <span className="dd-value" id={valId}>
          {selected?.label}
        </span>
        <span className="dd-caret" aria-hidden="true" />
      </button>

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        className="dd-list"
        tabIndex={-1}
        aria-labelledby={labelId}
        aria-label={labelId ? undefined : ariaLabel}
        aria-activedescendant={open ? optId(activeIndex) : undefined}
        hidden={!open}
        onKeyDown={onListKey}
      >
        {options.map((o, i) => (
          <li
            key={o.value}
            id={optId(i)}
            role="option"
            aria-selected={o.value === value}
            className={"dd-option" + (i === activeIndex ? " is-active" : "")}
            onMouseEnter={() => setActiveIndex(i)}
            onClick={() => choose(i)}
          >
            <span className="dd-check" aria-hidden="true" />
            <span className="dd-option-label">{o.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
