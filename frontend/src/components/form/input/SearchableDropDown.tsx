import React, { useState, useEffect, useRef } from "react";

interface Option {
  label: string;
  value: string | number;
}

interface SearchableDropdownProps {
  options: Option[];
  placeholder?: string;
  value?: string | number;
  onChange?: (value: string | number) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
  error?: boolean;
  success?: boolean;
  hint?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  placeholder = "Select...",
  value,
  onChange,
  label,
  id,
  disabled = false,
  error = false,
  success = false,
  hint,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update filtered options based on query
  useEffect(() => {
    setFilteredOptions(
      options.filter((option) =>
        option.label.toLowerCase().includes(query.toLowerCase())
      )
    );
  }, [query, options]);

  // Sync query with selected value on value change
  useEffect(() => {
    const selected = options.find((opt) => opt.value === value);
    if (selected) {
      setQuery(selected.label);
    }
  }, [value, options]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const inputClasses = `h-11 w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 
    ${
      disabled
        ? "text-gray-500 border-gray-300 opacity-40 bg-gray-100 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400"
        : ""
    }
    ${
      error
        ? "border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:text-error-400"
        : ""
    }
    ${
      success
        ? "border-success-500 focus:border-success-300 focus:ring-success-500/20 dark:text-success-400"
        : ""
    }
    ${
      !error && !success && !disabled
        ? "bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
        : ""
    } dark:bg-gray-900`;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <input
        type="text"
        id={id}
        className={inputClasses}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onClick={() => setIsOpen(true)}
        disabled={disabled}
      />

      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-52 overflow-auto rounded-md bg-white shadow-lg dark:bg-gray-800 border dark:border-gray-700">
          {filteredOptions.map((option) => (
            <li
              key={option.value}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
              onClick={() => {
                onChange?.(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}

      {hint && (
        <p
          className={`mt-1.5 text-xs ${
            error
              ? "text-error-500"
              : success
              ? "text-success-500"
              : "text-gray-500"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default SearchableDropdown;
