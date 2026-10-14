export interface Organization {
    id: number;
    code: string;
    name: string;
    is_default?: boolean;
}

export interface Role {
    id: number;
    name: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    employee_number?: string;
    job_title?: string;
    is_active?: boolean;
    locale?: string;
    roles?: { id: number; name: string }[];
    organizations?: Organization[];
    created_at?: string;
    permissions?: string[];
}

export interface Flash {
    success?: string | null;
    error?: string | null;
}

export interface AppNotification {
    id: number;
    event: string;
    title: string;
    message: string | null;
    resource_type: string | null;
    resource_id: number | null;
    read_at: string | null;
    created_at: string;
    time_ago: string;
}

export interface NotificationsData {
    unreadCount: number;
    recent: AppNotification[];
}

export interface ThemeConfig {
    preset: string;
    primaryHsl: string;
    primaryHslDark: string;
    radius: string;
    fontHeading: string;
    fontBody: string;
}

export interface AppConfig {
    appName: string;
    appDescription: string;
    instansiName: string;
    organizationName: string;
    currentYear: number;
    activePeriodName?: string;
    activePeriodStartYear?: number;
    activePeriodEndYear?: number;
    activePeriodRange?: string;
    activePeriodYears?: number[];
    logoUrl: string;
    faviconUrl: string;
    headlineImageUrl: string;
    loginImageUrl: string;
    headlineTitle: string;
    headlineSubtitle: string;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    flash: Flash;
    theme: ThemeConfig;
    appConfig: AppConfig;
    systemNotifications?: NotificationsData | null;
};


