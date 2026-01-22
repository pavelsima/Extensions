import { createNodeDescriptor } from "@cognigy/extension-tools";
import { AuthenticatedCallNodeParams } from "../types";

export const cxoneAuthenticatedCall = createNodeDescriptor({
    type: "cxoneAuthenticatedCall",
    defaultLabel: "CXone Authenticated Call",
    summary: "Make an authenticated HTTP call using CXone token from input data",

    preview: {
        key: "url",
        type: "text"
    },

    fields: [
        {
            key: "url",
            label: "URL",
            type: "cognigyText",
            description: "The complete URL for the HTTP request",
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

            // Make the HTTP request
            api.log("info", `Executing ${method} request with Authorization header`);
            const response = await fetch(url, requestOptions);

            // Parse response
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

            api.log("info", `Request completed with status: ${response.status}`);

            // Store complete response object in configured target/key
            if (responseTarget && responseKey) {
                storeData(responseTarget, responseKey, result);
                const headerInfo = storeResponseHeaders ? " (including headers)" : "";
                api.log("info", `Complete response stored in ${responseTarget}.${responseKey}${headerInfo}`);
            }

            // Output the result
            api.output("Request completed successfully", result);

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