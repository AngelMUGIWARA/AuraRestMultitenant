type ColorVariant = 'amber' | 'sage' | 'gold' | 'cream';
interface StatCardProps {
    label: string;
    value: string;
    delta?: string;
    deltaPositive?: boolean;
    deltaLabel?: string;
    icon: React.ReactNode;
    colorVariant?: ColorVariant;
}
export declare function StatCard({ label, value, delta, deltaPositive, deltaLabel, icon, colorVariant, }: StatCardProps): import("react/jsx-runtime").JSX.Element;
export declare function StatCardSkeleton(): import("react/jsx-runtime").JSX.Element;
export {};
