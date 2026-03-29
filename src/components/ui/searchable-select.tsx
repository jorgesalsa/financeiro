"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchableOption = {
  value: string;
  label: string;
};

interface SearchableSelectProps {
  options: SearchableOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value: controlledValue,
  defaultValue = "",
  onChange,
  name,
  placeholder = "Selecione...",
  required,
  className,
  disabled,
}: SearchableSelectProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = isControlled ? controlledValue : internalValue;

  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Derive display text from selected value
  const selectedOption = options.find((o) => o.value === selectedValue);
  const displayText = selectedOption?.label ?? "";

  // Filtered options based on search
  const filtered = search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const setValue = useCallback(
    (val: string) => {
      if (!isControlled) setInternalValue(val);
      onChange?.(val);
    },
    [isControlled, onChange]
  );

  function handleSelect(optionValue: string) {
    setValue(optionValue);
    setSearch("");
    setIsOpen(false);
    setHighlightIndex(-1);
    inputRef.current?.blur();
  }

  function handleClear() {
    setValue("");
    setSearch("");
    setIsOpen(false);
  }

  function handleInputFocus() {
    setSearch("");
    setIsOpen(true);
    setHighlightIndex(-1);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setIsOpen(true);
    setHighlightIndex(0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightIndex(0);
      } else {
        setHighlightIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && highlightIndex >= 0 && filtered[highlightIndex]) {
        handleSelect(filtered[highlightIndex].value);
      }
    } else if (e.key === "Escape") {
      setSearch("");
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setSearch("");
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Hidden input for form submission */}
      {name && (
        <input type="hidden" name={name} value={selectedValue} />
      )}
      {/* Invisible required input for validation */}
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{
            position: "absolute",
            opacity: 0,
            height: 0,
            width: 0,
            pointerEvents: "none",
          }}
          value={selectedValue}
          required
          onChange={() => {}}
        />
      )}

      <div className="flex">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : displayText}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={selectedValue ? displayText : placeholder}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            "flex h-9 w-full rounded-md rounded-r-none border border-r-0 border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !isOpen && selectedValue && "text-foreground",
            !isOpen && !selectedValue && "text-muted-foreground"
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
              setSearch("");
            } else {
              setSearch("");
              setIsOpen(true);
              inputRef.current?.focus();
            }
          }}
          className={cn(
            "flex h-9 items-center rounded-md rounded-l-none border border-l-0 border-input bg-background px-2 text-muted-foreground",
            "hover:text-foreground transition-colors",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-input bg-background py-1 text-sm shadow-lg"
        >
          {selectedValue && (
            <li
              onClick={handleClear}
              className="cursor-pointer px-3 py-1.5 text-muted-foreground hover:bg-accent italic"
            >
              Limpar seleção
            </li>
          )}
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-muted-foreground text-center">
              Nenhum resultado
            </li>
          ) : (
            filtered.map((opt, idx) => (
              <li
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "cursor-pointer px-3 py-1.5 transition-colors",
                  idx === highlightIndex && "bg-accent",
                  opt.value === selectedValue &&
                    "font-medium text-primary",
                  idx !== highlightIndex && "hover:bg-accent/50"
                )}
              >
                {opt.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
