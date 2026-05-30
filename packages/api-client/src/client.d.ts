type RequestOptions = Omit<RequestInit, 'body'> & {
    params?: Record<string, string | number | boolean | undefined>;
};
export declare const apiClient: {
    get<T>(endpoint: string, options?: RequestOptions): Promise<T>;
    post<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<T>;
    put<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<T>;
    patch<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<T>;
    delete<T>(endpoint: string, options?: RequestOptions): Promise<T>;
};
export {};
