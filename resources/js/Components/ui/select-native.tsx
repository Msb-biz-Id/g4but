import * as React from 'react';
import { Select2, Select2Option } from './select2';
import { cn } from '@/lib/utils';

export interface SelectNativeProps
    extends React.SelectHTMLAttributes<HTMLSelectElement> {
    onValueChange?: (value: string) => void;
    options?: Select2Option[];
    placeholder?: string;
    searchPlaceholder?: string;
    searchable?: boolean;
}

const SelectNative = React.forwardRef<HTMLSelectElement, SelectNativeProps>(
    (
        {
            className,
            children,
            value,
            defaultValue,
            onChange,
            onValueChange,
            options,
            placeholder,
            searchPlaceholder = 'Cari...',
            searchable,
            disabled,
            required,
            name,
            id,
            ...props
        },
        _ref
    ) => {
        const handleChange = (val: string, syntheticEvent?: any) => {
            if (onValueChange) {
                onValueChange(val);
            }
            if (onChange) {
                const eventObj = syntheticEvent || {
                    target: { value: val, name: name || id || '', id: id || '' },
                    currentTarget: { value: val, name: name || id || '', id: id || '' },
                    value: val,
                    bubbles: true,
                    cancelable: true,
                    defaultPrevented: false,
                    persist: () => {},
                    preventDefault: () => {},
                    stopPropagation: () => {},
                };
                onChange(eventObj as React.ChangeEvent<HTMLSelectElement>);
            }
        };

        return (
            <Select2
                id={id}
                name={name}
                value={value}
                defaultValue={defaultValue}
                options={options}
                placeholder={placeholder}
                searchPlaceholder={searchPlaceholder}
                searchable={searchable}
                disabled={disabled}
                required={required}
                className={cn('w-full', className)}
                onChange={handleChange}
            >
                {children}
            </Select2>
        );
    }
);

SelectNative.displayName = 'SelectNative';

export { SelectNative, Select2 };
export default SelectNative;