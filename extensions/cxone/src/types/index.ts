/**
 * Type definitions for CXone Extension
 */

import { INodeFunctionBaseParams } from "@cognigy/extension-tools";

/**
 * CXone connection configuration
 */
export interface CXoneConnection {
    environmentUrl: string;
    accessKeyId: string;
    accessKeySecret: string;
    clientId: string;
    clientSecret: string;
}

/**
 * Cognigy API interface
 * Note: INodeExecutionAPI is not exported from @cognigy/extension-tools,
 * so we define a compatible interface based on what we actually use
 */
export interface CognigyApi {
    log?: (level: string, text: string) => void;
    addToContext?: (key: string, value: any, mode: string) => void;
    output?: (text: string | null, data?: any) => void;
    [key: string]: any; // Allow other properties from INodeExecutionAPI
}

/**
 * Cognigy context structure
 */
export interface CognigyContext {
    cxoneEncryptedToken?: string;
    cxoneTokenTimestamp?: number;
    cxoneTokenUrl?: string;
    cxoneApiUrl?: string;
    transcript?: ConversationItem[];
    [key: string]: any;
}

/**
 * Cognigy input structure
 */
export interface CognigyInput {
    channel?: string;
    transcript?: ConversationItem[];
    data?: any;
    [key: string]: any;
}

/**
 * Handover action type
 */
export type HandoverAction = "End" | "Escalate";

/**
 * Channel type detection
 */
export type ChannelType = "voice" | "chat" | "webchat" | "testchat";

/**
 * CXone token response from OAuth endpoint
 */
export interface CXoneTokenResponse {
    access_token: string;
    id_token: string;
    token_type?: string;
    expires_in?: number;
    refresh_token?: string;
    [key: string]: any;
}

/**
 * Decoded JWT token structure
 */
export interface DecodedJWTToken {
    iss: string;
    tenantId: string;
    [key: string]: any;
}

/**
 * OpenID configuration response
 */
export interface CXoneOpenIdConfigResponse {
    token_endpoint: string;
    [key: string]: any;
}

/**
 * CXone configuration response
 */
export interface CXoneConfigResponse {
    api_endpoint: string;
    [key: string]: any;
}

/**
 * Conversation item for transcript transformation
 */
export interface ConversationItem {
    role: "user" | "assistant";
    type: "input" | "output";
    payload: {
        text?: string | null;
        data?: any;
    };
    timestamp: number;
}

/**
 * Handover node configuration
 */
export interface HandoverNodeConfig {
    action: HandoverAction;
    contactId: string;
    spawnedContactId: string;
    businessNumber: string;
    optionalParamsObject?: any[];
    connection: CXoneConnection;
}

/**
 * Handover node parameters
 */
export interface HandoverNodeParams extends INodeFunctionBaseParams {
    config: HandoverNodeConfig;
}

/**
 * Send signal node configuration
 */
export interface SendSignalNodeConfig {
    contactId: string;
    signalParams: string[];
    connection: CXoneConnection;
}

/**
 * Send signal node parameters
 */
export interface SendSignalNodeParams extends INodeFunctionBaseParams {
    config: SendSignalNodeConfig;
}

/**
 * Response storage target types
 */
export type ResponseTarget = "context" | "input";

/**
 * Payload type options
 */
export type PayloadType = "json" | "text" | "form";

/**
 * Error types for standardized error handling
 */
export type ErrorType =
    | "MissingToken"
    | "InvalidConfig"
    | "Timeout"
    | "NetworkError"
    | "HttpError"
    | "RetryExhausted";

/**
 * Standardized error payload structure
 */
export interface StandardizedError {
    type: ErrorType;
    message: string;
    status?: number;
    details?: Record<string, any>;
    requestId?: string;
}

/**
 * Standardized response payload structure
 */
export interface StandardizedResponse {
    success: boolean;
    error?: StandardizedError;
    data?: any;
}

/**
 * Authenticated call node configuration
 */
export interface AuthenticatedCallNodeConfig {
    url: string;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers: Record<string, string>;

    // Legacy body field for backward compatibility
    body?: string;

    // Payload configuration (for non-GET/DELETE methods)
    payloadType?: PayloadType;
    bodyJson?: any;
    bodyText?: string;
    bodyForm?: Record<string, string>;

    // Execution configuration
    timeoutMs?: number;
    enableRetry?: boolean;
    retryAttempts?: number;

    // Error handling and debug configuration
    failOnNon2xx?: boolean;
    debugMode?: boolean;

    // Security configuration
    allowInsecureSSL?: boolean;

    responseTarget?: ResponseTarget;
    responseKey?: string;
    storeResponseHeaders?: boolean;
}

/**
 * Authenticated call node parameters
 */
export interface AuthenticatedCallNodeParams extends INodeFunctionBaseParams {
    config: AuthenticatedCallNodeConfig;
}

