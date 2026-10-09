import { Checkbox as UICheckbox } from '@/Components/ui/checkbox';
import { forwardRef } from 'react';

interface CheckboxProps {
    name?: string;
    checked?: boolean;
    disabled?: boolean;
    required?: boolean;
    className?: string;
    id?: string;
    onChange?: (event: { target: { checked: boolean } }) => void;
}

export default forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
    { className = '', onChange, ...props },
    ref,
) {
    return (
        <UICheckbox
            ref={ref}
            className={className}
            onCheckedChange={(value) =>
                onChange?.({ target: { checked: Boolean(value) } })
            }
            {...props}
        />
    );
});