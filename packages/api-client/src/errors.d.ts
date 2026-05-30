export declare class ApiClientError extends Error {
    readonly statusCode: number;
    readonly errors?: Record<string, string[]> | undefined;
    constructor(statusCode: number, message: string, errors?: Record<string, string[]> | undefined);
}
