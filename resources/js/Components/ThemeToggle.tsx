import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { getStoredTheme, storeTheme, type ThemePreference } from '@/lib/theme';

const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Terang', icon: Sun },
    { value: 'dark', label: 'Gelap', icon: Moon },
    { value: 'system', label: 'Sistem', icon: Monitor },
];

export default function ThemeToggle() {
    const [preference, setPreference] = useState<ThemePreference>('system');

    useEffect(() => {
        setPreference(getStoredTheme());
    }, []);

    const select = (value: ThemePreference) => {
        setPreference(value);
        storeTheme(value);
    };

    const CurrentIcon = options.find((o) => o.value === preference)?.icon ?? Sun;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" type="button" aria-label="Ganti tema">
                    <CurrentIcon className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {options.map((o) => (
                    <DropdownMenuItem key={o.value} onClick={() => select(o.value)}>
                        <o.icon className="mr-2 h-4 w-4" />
                        {o.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}