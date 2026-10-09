import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export interface Select2Option {
    value: string | number;
    label: string;
    disabled?: boolean;
}

export interface Select2Props {
    value?: any;
    defaultValue?: any;
    onChange?: (value: string) => void;
    options?: Select2Option[];
    children?: React.ReactNode;
    placeholder?: string;
    searchPlaceholder?: string;
    className?: string;
    disabled?: boolean;
    required?: boolean;
    name?: string;
    id?: string;
    searchable?: boolean;
}

function extractOptionsFromChildren(children: React.ReactNode): Select2Option[] {
    const opts: Select2Option[] = [];

    function parse(node: React.ReactNode) {
        React.Children.forEach(node, (child) => {
            if (!child) return;
            if (React.isValidElement(child)) {
                if (child.type === React.Fragment) {
                    parse((child.props as any).children);
                    return;
                }
                const props = child.props as any;
                if (child.type === 'option') {
                    const rawVal = props.value !== undefined ? props.value : props.children;
                    const val = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';

                    let lbl = '';
                    if (typeof props.children === 'string' || typeof props.children === 'number') {
                        lbl = String(props.children);
                    } else if (Array.isArray(props.children)) {
                        lbl = props.children
                            .map((c: any) => (typeof c === 'string' || typeof c === 'number' ? c : ''))
                            .join('');
                    } else if (props.label) {
                        lbl = String(props.label);
                    } else {
                        lbl = val;
                    }

                    opts.push({
                        value: val,
                        label: lbl || val,
                        disabled: Boolean(props.disabled),
                    });
                } else if (props && props.children) {
                    parse(props.children);
                }
            }
        });
    }

    parse(children);
    return opts;
}

export function Select2({
    value,
    defaultValue,
    onChange,
    options,
    children,
    placeholder = 'Pilih Opsi',
    searchPlaceholder = 'Cari...',
    className = '',
    disabled = false,
    required = false,
    name,
    id,
    searchable,
}: Select2Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
    const [internalValue, setInternalValue] = useState<string | number | undefined>(
        value !== undefined ? (value ?? '') : (defaultValue ?? '')
    );

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const optionsListRef = useRef<HTMLDivElement>(null);

    // Sync controlled value
    useEffect(() => {
        if (value !== undefined) {
            setInternalValue(value ?? '');
        }
    }, [value]);

    // Extract options from either props.options or props.children
    const resolvedOptions = useMemo<Select2Option[]>(() => {
        if (options && options.length > 0) {
            return options;
        }
        if (children) {
            return extractOptionsFromChildren(children);
        }
        return [];
    }, [options, children]);

    const activeValue = value !== undefined ? (value ?? '') : (internalValue ?? '');

    const selectedOption = useMemo(() => {
        return resolvedOptions.find((opt) => String(opt.value) === String(activeValue));
    }, [resolvedOptions, activeValue]);

    // Determine if search should be shown (default: when > 5 options or searchPlaceholder specified)
    const showSearch = searchable ?? (resolvedOptions.length > 5 || (Boolean(searchPlaceholder) && searchPlaceholder !== 'Cari...'));

    // Filter options based on search query
    const filteredOptions = useMemo(() => {
        if (!search.trim()) return resolvedOptions;
        const q = search.toLowerCase();
        return resolvedOptions.filter((opt) =>
            opt.label.toLowerCase().includes(q)
        );
    }, [resolvedOptions, search]);

    const handleSelect = useCallback((optValue: string | number) => {
        const valStr = String(optValue);
        setInternalValue(valStr);
        setIsOpen(false);
        setSearch('');

        if (onChange) {
            // Pass primitive string as first argument so serializers (like qs / Inertia router.get)
            // do not serialize internal object properties into query parameters (e.g. [target][value]).
            // A synthetic event object is provided as the second argument for compatibility.
            (onChange as any)(valStr, {
                target: { value: valStr, name: name || id || '', id: id || '' },
                currentTarget: { value: valStr, name: name || id || '', id: id || '' },
            });
        }

        setTimeout(() => {
            triggerRef.current?.focus();
        }, 10);
    }, [onChange, name, id]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input or scroll selected option into view on open
    useEffect(() => {
        if (isOpen) {
            setSearch('');
            setHighlightedIndex(-1);
            if (showSearch) {
                setTimeout(() => {
                    searchInputRef.current?.focus();
                }, 50);
            }
        }
    }, [isOpen, showSearch]);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                triggerRef.current?.focus();
                break;
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((prev) =>
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                    const chosen = filteredOptions[highlightedIndex];
                    if (!chosen.disabled) {
                        handleSelect(chosen.value);
                    }
                }
                break;
            case 'Tab':
                setIsOpen(false);
                break;
        }
    };

    // Auto-scroll highlighted option into view
    useEffect(() => {
        if (highlightedIndex >= 0 && optionsListRef.current) {
            const item = optionsListRef.current.children[highlightedIndex] as HTMLElement;
            if (item && item.scrollIntoView) {
                item.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    return (
        <div
            ref={containerRef}
            className={`relative w-full text-left ${className}`}
            onKeyDown={handleKeyDown}
        >
            {/* Hidden native select for HTML5 form validation and form submission */}
            {name && (
                <select
                    name={name}
                    id={id}
                    value={activeValue}
                    required={required}
                    disabled={disabled}
                    aria-hidden="true"
                    tabIndex={-1}
                    className="sr-only absolute opacity-0 pointer-events-none"
                    onChange={(e) => handleSelect(e.target.value)}
                >
                    <option value="">{placeholder}</option>
                    {resolvedOptions.map((opt) => (
                        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            )}

            {/* Trigger Button */}
            <button
                ref={triggerRef}
                id={!name ? id : undefined}
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className={`w-full flex items-center justify-between border rounded px-2.5 py-1 text-xs text-left transition h-9 sm:h-8 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary ${
                    disabled
                        ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                        : 'cursor-pointer bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 shadow-2xs'
                }`}
            >
                <span
                    className={`truncate mr-1.5 ${
                        selectedOption && selectedOption.value !== ''
                            ? 'text-slate-900 dark:text-slate-100 font-medium'
                            : 'text-slate-400 dark:text-slate-400 font-normal'
                    }`}
                >
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-400 shrink-0 transition-transform duration-150 ${
                        isOpen ? 'rotate-180 text-primary dark:text-primary' : ''
                    }`}
                />
            </button>

            {/* Dropdown Popover Menu */}
            {isOpen && (
                <div
                    className="absolute z-[60] mt-1 w-full min-w-[220px] rounded-md border py-1 text-xs shadow-xl animate-in fade-in-0 zoom-in-95 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:shadow-2xl dark:shadow-black/70"
                >
                    {/* Search Input */}
                    {showSearch && (
                        <div className="px-2.5 py-1.5 border-b flex items-center gap-1.5 border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
                            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 shrink-0" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setHighlightedIndex(-1);
                                }}
                                placeholder={searchPlaceholder}
                                className="w-full text-xs border-none p-0 bg-transparent focus:outline-none focus:ring-0 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 font-normal"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 p-0.5 rounded transition"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Options List */}
                    <div
                        ref={optionsListRef}
                        role="listbox"
                        className="max-h-60 overflow-y-auto py-1 scrollbar-thin"
                    >
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-3 text-center text-slate-400 dark:text-slate-400 text-xs italic">
                                Tidak ada data yang sesuai
                            </div>
                        ) : (
                            filteredOptions.map((opt, idx) => {
                                const isSelected = String(opt.value) === String(activeValue);
                                const isHighlighted = idx === highlightedIndex;

                                return (
                                    <div
                                        key={`${opt.value}-${idx}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => {
                                            if (!opt.disabled) {
                                                handleSelect(opt.value);
                                            }
                                        }}
                                        onMouseEnter={() => setHighlightedIndex(idx)}
                                        className={`flex items-center justify-between px-3 py-2 cursor-pointer transition text-xs select-none ${
                                            opt.disabled
                                                ? 'opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-500'
                                                : isSelected
                                                ? 'bg-primary/10 text-primary font-semibold dark:bg-primary/25 dark:text-indigo-300 dark:font-bold'
                                                : isHighlighted
                                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <span className="truncate mr-2">{opt.label}</span>
                                        {isSelected && (
                                            <Check className="w-3.5 h-3.5 text-primary dark:text-indigo-400 shrink-0" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Select2;
