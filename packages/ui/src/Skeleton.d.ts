interface SkeletonProps {
    className?: string;
    style?: React.CSSProperties;
}
export declare function Skeleton({ className, style }: SkeletonProps): import("react/jsx-runtime").JSX.Element;
export declare function SkeletonText({ lines, className, }: {
    lines?: number;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function SkeletonAvatar({ size }: {
    size?: 'sm' | 'md' | 'lg';
}): import("react/jsx-runtime").JSX.Element;
export declare function SkeletonCard({ className }: SkeletonProps): import("react/jsx-runtime").JSX.Element;
export declare function SkeletonRow({ cols }: {
    cols?: number;
}): import("react/jsx-runtime").JSX.Element;
export {};
