import { createNodeDescriptor } from "@cognigy/extension-tools";
import { AuthenticatedCallNodeParams } from "../types";

export const cxoneAuthenticatedCall = createNodeDescriptor({
    type: "cxoneAuthenticatedCall",
    defaultLabel: "CXone Authenticated Call",
    summary: "Make an authenticated HTTP call using CXone token from input data with timeout and retry controls",

    preview: {
        key: "url",
        type: "text"
    },

    fields: [
        {
            key: "url",
            label: "URL",
            type: "cognigyText",
            description: "The complete URL for the HTTP request. Authentication will be automatically handled using CXone token from input.data.cxonetoken or context.cxonetoken.",
            params: {
                required: true
            }
        },
        {
            key: "method",
            label: "HTTP Method",
            type: "select",
            description: "Select the HTTP method for the request",
            defaultValue: "GET",
            params: {
                options: [
                    { label: "GET", value: "GET" },
                    { label: "POST", value: "POST" },
                    { label: "PUT", value: "PUT" },
                    { label: "PATCH", value: "PATCH" },
                    { label: "DELETE", value: "DELETE" }
                ],
                required: true
            }
        },
        {
            key: "headers",
            label: "Headers",
            type: "json",
            description: "Additional headers to include in the request (Authorization header will be automatically injected)",
            defaultValue: "{}",
            params: {
                required: false
            }
        },
        {
            key: "payloadType",
            label: "Payload Type",
            type: "select",
            description: "Select the format of the request body",
            defaultValue: "json",
            params: {
                options: [
                    { label: "JSON", value: "json" },
                    { label: "Text", value: "text" },
                    { label: "Form Data", value: "form" }
                ],
                required: false
            },
            condition: {
                key: "method",
                value: "GET",
                negate: true
            }
        },
        {
            key: "bodyJson",
            label: "Request Body (JSON)",
            type: "json",
            description: "Request body as JSON object",
            defaultValue: "{}",
            params: {
                required: false
            },
            condition: {
                key: "payloadType",
                value: "json"
            }
        },
        {
            key: "bodyText",
            label: "Request Body (Text)",
            type: "cognigyText",
            description: "Request body as plain text",
            defaultValue: "",
            params: {
                required: false
            },
            condition: {
                key: "payloadType",
                value: "text"
            }
        },
        {
            key: "bodyForm",
            label: "Request Body (Form Data)",
            type: "json",
            description: "Request body as key-value pairs for form data (e.g., {\"key1\": \"value1\", \"key2\": \"value2\"})",
            defaultValue: "{}",
            params: {
                required: false
            },
            condition: {
                key: "payloadType",
                value: "form"
            }
        },
        {
            key: "responseTarget",
            label: "Store Result In",
            type: "select",
            description: "Where to store the response data",
            defaultValue: "context",
            params: {
                options: [
                    { label: "Context", value: "context" },
                    { label: "Input", value: "input" }
                ],
                required: false
            }
        },
        {
            key: "responseKey",
            label: "Key to store Result",
            type: "cognigyText",
            description: "Key where response data will be stored",
            defaultValue: "cxoneApiResponse",
            params: {
                required: false
            }
        },
        {
            key: "storeResponseHeaders",
            label: "Store Response Headers",
            type: "toggle",
            description: "Store response headers alongside response data",
            defaultValue: false,
            params: {
                required: false
            }
        },
        {
            key: "timeoutMs",
            label: "Timeout (ms)",
            type: "number",
            description: "Request timeout in milliseconds (1-30 seconds). Prevents requests from hanging indefinitely. Hard 30-second execution budget applies regardless of this setting.",
            defaultValue: 8000,
            params: {
                required: false,
                min: 1000,
                max: 30000
            }
        },
        {
            key: "enableRetry",
            label: "Enable Retry",
            type: "toggle",
            description: "Enable automatic retry on network errors, timeouts, and server errors. Additional attempts beyond initial request.",
            defaultValue: false,
            params: {
                required: false
            }
        },
        {
            key: "retryAttempts",
            label: "Retry Attempts",
            type: "number",
            description: "Additional retry attempts beyond the initial request. Uses exponential backoff with jitter.",
            defaultValue: 1,
            params: {
                required: false,
                min: 1,
                max: 5
            },
            condition: {
                key: "enableRetry",
                value: true
            }
        }
    ],

    sections: [
        {
            key: "headersSection",
            label: "Headers",
            defaultCollapsed: true,
            fields: [
                "headers",
                "storeResponseHeaders"
            ]
        },
        {
            key: "payloadSection",
            label: "Payload",
            defaultCollapsed: false,
            fields: [
                "payloadType",
                "bodyJson",
                "bodyText",
                "bodyForm"
            ]
        },
        {
            key: "executionSection",
            label: "Execution",
            defaultCollapsed: true,
            fields: [
                "timeoutMs",
                "enableRetry",
                "retryAttempts"
            ]
        },
        {
            key: "storageSection",
            label: "Storage Options",
            defaultCollapsed: true,
            fields: [
                "responseTarget",
                "responseKey"
            ]
        }
    ],

    form: [
        { type: "field", key: "method" },
        { type: "field", key: "url" },
        { type: "section", key: "headersSection" },
        { type: "section", key: "payloadSection" },
        { type: "section", key: "executionSection" },
        { type: "section", key: "storageSection" }
    ],

    appearance: {
        color: "#3694FD"
    },

    function: async ({ cognigy, config }: AuthenticatedCallNodeParams) => {
        const {
            url,
            method,
            headers = {},
            body, // Legacy field for backward compatibility
            payloadType,
            bodyJson,
            bodyText,
            bodyForm,
            timeoutMs = 8000,
            enableRetry = false,
            retryAttempts = 1,
            responseTarget = "context",
            responseKey = "cxoneApiResponse",
            storeResponseHeaders = false
        } = config;
        const { api, input } = cognigy;

        // Helper function to determine payload data based on payload type
        const getPayloadData = () => {
            if (method === "GET" || method === "DELETE") {
                return undefined;
            }

            // Use new payload fields if available
            if (payloadType && (bodyJson !== undefined || bodyText !== undefined || bodyForm !== undefined)) {
                switch (payloadType) {
                    case "json":
                        return bodyJson;
                    case "text":
                        return bodyText;
                    case "form":
                        return bodyForm;
                    default:
                        return undefined;
                }
            }

            // Fallback to legacy body field for backward compatibility
            return body;
        };

        // Helper function to prepare request body and content type
        const prepareRequestBody = (currentPayloadType: string | undefined, payloadData: any) => {
            if (!payloadData || method === "GET" || method === "DELETE") {
                return { body: undefined, contentType: "application/json" };
            }

            let requestBody: string;
            let contentType: string;

            // Determine effective payload type
            const effectivePayloadType = currentPayloadType || "json"; // Default to JSON for legacy compatibility

            switch (effectivePayloadType) {
                case "json":
                    contentType = "application/json";
                    if (typeof payloadData === "string") {
                        requestBody = payloadData;
                    } else {
                        requestBody = JSON.stringify(payloadData);
                    }
                    break;
                case "text":
                    contentType = "text/plain";
                    requestBody = String(payloadData);
                    break;
                case "form":
                    contentType = "application/x-www-form-urlencoded";
                    if (typeof payloadData === "object" && payloadData !== null) {
                        // Convert object to URL-encoded string
                        const params = new URLSearchParams();
                        for (const [key, value] of Object.entries(payloadData)) {
                            params.append(key, String(value));
                        }
                        requestBody = params.toString();
                    } else {
                        requestBody = String(payloadData);
                    }
                    break;
                default:
                    // Fallback to JSON for unknown types
                    contentType = "application/json";
                    if (typeof payloadData === "string") {
                        requestBody = payloadData;
                    } else {
                        requestBody = JSON.stringify(payloadData);
                    }
                    break;
            }

            return { body: requestBody, contentType };
        };

        // Helper function to store data based on target and key
        const storeData = (target: string, key: string, data: unknown) => {
            if (!key) return;

            try {
                switch (target) {
                    case "context":
                        api.addToContext(key, data, "simple");
                        break;
                    case "input":
                        input[key] = data;
                        break;
                    default:
                        api.log("error", `Unsupported response target: ${target}`);
                        break;
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                api.log("error", `Failed to store response data with key ${key}: ${errorMessage}`);
            }
        };

        // Execution configuration and constants
        const EXECUTION_BUDGET_MS = 30000; // 30 seconds hard limit
        const MAX_BACKOFF_MS = 5000; // Maximum delay between retries
        const BASE_BACKOFF_MS = 1000; // Base delay for exponential backoff

        // Helper function for delay with jitter
        const sleep = (ms: number): Promise<void> => {
            return new Promise(resolve => setTimeout(resolve, ms));
        };

        // Helper function to calculate backoff delay with exponential backoff and jitter
        const calculateBackoffDelay = (attempt: number): number => {
            const exponentialDelay = Math.min(BASE_BACKOFF_MS * Math.pow(2, attempt - 1), MAX_BACKOFF_MS);
            const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
            return Math.floor(exponentialDelay + jitter);
        };

        // Helper function to determine if error should be retried
        const isRetryableError = (error: any, response?: Response): boolean => {
            // Network errors (fetch failures)
            if (error && !response) {
                return true;
            }

            // HTTP status codes that should be retried
            if (response && response.status) {
                return response.status >= 500 || response.status === 429;
            }

            return false;
        };

        // Helper function to make HTTP request with timeout
        const makeHttpRequest = async (requestUrl: string, requestOptions: RequestInit, timeoutMs: number): Promise<Response> => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const response = await fetch(requestUrl, {
                    ...requestOptions,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error(`Request timeout after ${timeoutMs}ms`);
                }
                throw error;
            }
        };

        try {
            // Check for cxonetoken in input.data first, then context as fallback
            const cxoneToken = input?.data?.cxonetoken || cognigy.context?.cxonetoken;
            let tokenSource = "input.data";

            if (input?.data?.cxonetoken) {
                tokenSource = "input.data";
            } else if (cognigy.context?.cxonetoken) {
                tokenSource = "context";
            }

            if (!cxoneToken) {
                const errorMessage = "Missing cxonetoken in input.data or context.cxonetoken. This node can only be used in flows invoked by CXone with authentication.";
                api.log("error", errorMessage);
                api.output("Authentication Error", {
                    error: errorMessage,
                    status: 401
                });
                return;
            }

            api.log("info", `Using cxonetoken from ${tokenSource}`);

            api.log("info", `Making ${method} request to: ${url}`);

            // Get payload data and prepare request body
            const payloadData = getPayloadData();
            const { body: requestBody, contentType: requestContentType } = prepareRequestBody(payloadType, payloadData);

            // Prepare headers with injected Authorization and appropriate Content-Type
            const requestHeaders: Record<string, string> = {
                "Content-Type": requestContentType,
                ...headers,
                // Override any user-provided Authorization header
                "Authorization": `Bearer ${cxoneToken}`
            };

            // Prepare request options
            const requestOptions: RequestInit = {
                method,
                headers: requestHeaders
            };

            // Add body for methods that support it (not GET or DELETE)
            if (requestBody && method !== "GET" && method !== "DELETE") {
                requestOptions.body = requestBody;
            }

            // Execute HTTP request with retry logic and budget guard
            const startTime = Date.now();
            let lastError: Error | undefined;
            let lastResponse: Response | undefined;
            const maxAttempts = enableRetry ? Math.min(retryAttempts + 1, 6) : 1;

            api.log("info", `Executing ${method} request with timeout: ${timeoutMs}ms, max attempts: ${maxAttempts}`);

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                // Check execution budget before each attempt
                const elapsedTime = Date.now() - startTime;
                if (elapsedTime >= EXECUTION_BUDGET_MS) {
                    const budgetError = {
                        status: 500,
                        body: {
                            error: `Execution budget exhausted (${EXECUTION_BUDGET_MS}ms exceeded). Request cancelled to prevent platform timeout.`,
                            attempts: attempt - 1,
                            elapsedMs: elapsedTime
                        }
                    };

                    if (responseTarget && responseKey) {
                        storeData(responseTarget, responseKey, budgetError);
                    }

                    api.log("error", `CXone Authenticated Call: Execution budget exhausted after ${elapsedTime}ms`);
                    api.output("Request failed - execution budget exceeded", budgetError);
                    return;
                }

                try {
                    // Calculate remaining budget for this attempt
                    const remainingBudget = EXECUTION_BUDGET_MS - elapsedTime;
                    const effectiveTimeout = Math.min(timeoutMs, remainingBudget - 1000); // Leave 1s buffer

                    if (effectiveTimeout < 1000) {
                        throw new Error("Insufficient remaining budget for request timeout");
                    }

                    api.log("info", `Attempt ${attempt}/${maxAttempts} - timeout: ${effectiveTimeout}ms`);

                    // Make the HTTP request
                    const response = await makeHttpRequest(url, requestOptions, effectiveTimeout);

                    // Check if response should be retried
                    if (!isRetryableError(undefined, response) || attempt === maxAttempts) {
                        // Success or final attempt - parse and return response
                        let responseBody;
                        const responseContentType = response.headers.get("content-type");

                        if (responseContentType && responseContentType.includes("application/json")) {
                            responseBody = await response.json();
                        } else {
                            responseBody = await response.text();
                        }

                        // Prepare result object
                        const result: any = {
                            status: response.status,
                            body: responseBody
                        };

                        // Add headers to result if enabled
                        if (storeResponseHeaders) {
                            const responseHeaders: Record<string, string> = {};
                            response.headers.forEach((value, key) => {
                                responseHeaders[key] = value;
                            });
                            result.headers = responseHeaders;
                        }

                        // Add retry information if retries were attempted
                        if (enableRetry && attempt > 1) {
                            result.retryInfo = {
                                attempts: attempt,
                                elapsedMs: Date.now() - startTime
                            };
                        }

                        api.log("info", `Request completed with status: ${response.status} (attempt ${attempt}/${maxAttempts})`);

                        // Store complete response object in configured target/key
                        if (responseTarget && responseKey) {
                            storeData(responseTarget, responseKey, result);
                            const headerInfo = storeResponseHeaders ? " (including headers)" : "";
                            api.log("info", `Complete response stored in ${responseTarget}.${responseKey}${headerInfo}`);
                        }

                        // Output the result
                        const outputMessage = response.ok ? "Request completed successfully" : `Request completed with status ${response.status}`;
                        api.output(outputMessage, result);
                        return;
                    }

                    // Store for potential retry
                    lastResponse = response;
                    api.log("warn", `Attempt ${attempt} received retryable status ${response.status}, will retry`);

                } catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));

                    // Check if error should be retried
                    if (!enableRetry || !isRetryableError(lastError) || attempt === maxAttempts) {
                        // Not retryable or final attempt - throw error
                        throw lastError;
                    }

                    api.log("warn", `Attempt ${attempt} failed with error: ${lastError.message}, will retry`);
                }

                // Wait before next retry (skip delay on final attempt)
                if (attempt < maxAttempts) {
                    const backoffDelay = calculateBackoffDelay(attempt);
                    const remainingBudget = EXECUTION_BUDGET_MS - (Date.now() - startTime);

                    if (remainingBudget < backoffDelay + timeoutMs) {
                        // Not enough budget for delay + next attempt
                        api.log("warn", `Insufficient budget for retry delay, stopping retries`);
                        break;
                    }

                    api.log("info", `Waiting ${backoffDelay}ms before retry attempt ${attempt + 1}`);
                    await sleep(backoffDelay);
                }
            }

            // All retries exhausted - return structured error
            const finalElapsed = Date.now() - startTime;
            const retryExhaustionError = {
                status: lastResponse?.status || 500,
                body: {
                    error: lastError?.message || `All ${maxAttempts} attempts failed`,
                    retryInfo: {
                        attempts: maxAttempts,
                        elapsedMs: finalElapsed,
                        lastError: lastError?.message,
                        lastStatus: lastResponse?.status
                    }
                }
            };

            if (responseTarget && responseKey) {
                storeData(responseTarget, responseKey, retryExhaustionError);
            }

            api.log("error", `CXone Authenticated Call: All ${maxAttempts} attempts failed after ${finalElapsed}ms`);
            api.output("Request failed - retry attempts exhausted", retryExhaustionError);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred during HTTP request";
            api.log("error", `CXone Authenticated Call error: ${errorMessage}`);

            // Return structured error response
            const errorResult = {
                status: 500,
                body: {
                    error: errorMessage
                }
            };

            // Store complete error response in configured target/key
            if (responseTarget && responseKey) {
                storeData(responseTarget, responseKey, errorResult);
                api.log("info", `Error response stored in ${responseTarget}.${responseKey}`);
            }

            // Output the error result
            api.output("Request failed", errorResult);
        }
    }
});