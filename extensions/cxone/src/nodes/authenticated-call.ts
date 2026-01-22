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
            key: "body",
            label: "Request Body",
            type: "json",
            description: "Request body for POST, PUT, and PATCH requests. Can be JSON object or raw text.",
            defaultValue: "",
            params: {
                required: false
            }
        },
        {
            key: "responseTarget",
            label: "Response Target",
            type: "select",
            description: "Where to store the response data",
            defaultValue: "context",
            params: {
                options: [
                    { label: "Context", value: "context" },
                    { label: "Input", value: "input" },
                    { label: "Profile", value: "profile" }
                ],
                required: false
            }
        },
        {
            key: "responsePath",
            label: "Response Path",
            type: "cognigyText",
            description: "Path where response data will be stored (e.g., context.cxone.lastResponse)",
            defaultValue: "context.cxoneApiResponse",
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

    form: [
        { type: "field", key: "method" },
        { type: "field", key: "url" },
        { type: "field", key: "headers" },
        { type: "field", key: "body" },
        { type: "field", key: "responseTarget" },
        { type: "field", key: "responsePath" },
        { type: "field", key: "storeResponseHeaders" }
    ],

    appearance: {
        color: "#3694FD"
    },

    function: async ({ cognigy, config }: AuthenticatedCallNodeParams) => {
        const {
            url,
            method,
            headers = {},
            body,
            responseTarget = "context",
            responsePath = "context.cxoneApiResponse",
            storeResponseHeaders = false
        } = config;
        const { api, input } = cognigy;

        // Helper function to store data at a specified path based on target
        const storeDataAtPath = (target: string, path: string, data: unknown) => {
            if (!responsePath) return;

            try {
                switch (target) {
                    case "context":
                        // Extract the key from the path (e.g., "context.cxone.lastResponse" -> "cxone.lastResponse")
                        const contextKey = path.startsWith("context.") ? path.substring(8) : path;
                        api.addToContext(contextKey, data, "simple");
                        break;

                    case "input":
                        // For input, we need to set nested properties
                        const inputParts = path.split(".");
                        if (inputParts.length === 1) {
                            input[inputParts[0]] = data;
                        } else {
                            // Create nested structure
                            let current = input;
                            for (let i = 0; i < inputParts.length - 1; i++) {
                                if (!current[inputParts[i]]) {
                                    current[inputParts[i]] = {};
                                }
                                current = current[inputParts[i]];
                            }
                            current[inputParts[inputParts.length - 1]] = data;
                        }
                        break;

                    case "profile":
                        // For profile, we use the profile API if available
                        const profileKey = path.startsWith("profile.") ? path.substring(8) : path;
                        if ("setProfileKey" in api && typeof api.setProfileKey === "function") {
                            api.setProfileKey(profileKey, data);
                        } else {
                            api.log("warn", "Profile storage not available, falling back to context");
                            api.addToContext(profileKey, data, "simple");
                        }
                        break;

                    default:
                        api.log("error", `Unsupported response target: ${target}`);
                        break;
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                api.log("error", `Failed to store response data at ${path}: ${errorMessage}`);
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

            // Prepare headers with injected Authorization
            const requestHeaders: Record<string, string> = {
                "Content-Type": "application/json",
                ...headers,
                // Override any user-provided Authorization header
                "Authorization": `Bearer ${cxoneToken}`
            };

            // Prepare request options
            const requestOptions: RequestInit = {
                method,
                headers: requestHeaders
            };

            // Add body for methods that support it
            if (method !== "GET" && method !== "DELETE" && body) {
                if (typeof body === "string") {
                    requestOptions.body = body;
                } else {
                    requestOptions.body = JSON.stringify(body);
                }
            }

            // Make the HTTP request
            api.log("info", `Executing ${method} request with Authorization header`);
            const response = await fetch(url, requestOptions);

            // Parse response
            let responseBody;
            const contentType = response.headers.get("content-type");

            if (contentType && contentType.includes("application/json")) {
                responseBody = await response.json();
            } else {
                responseBody = await response.text();
            }

            // Prepare result
            const result = {
                status: response.status,
                body: responseBody
            };

            api.log("info", `Request completed with status: ${response.status}`);

            // Store response body in configured target/path
            if (responseTarget && responsePath) {
                storeDataAtPath(responseTarget, responsePath, responseBody);
                api.log("info", `Response body stored at ${responseTarget}.${responsePath}`);
            }

            // Store response headers if enabled
            if (storeResponseHeaders && responseTarget && responsePath) {
                // Create redacted headers object (exclude any request authorization data)
                const responseHeaders: Record<string, string> = {};
                response.headers.forEach((value, key) => {
                    // Only store response headers, never store request authorization headers
                    responseHeaders[key] = value;
                });

                // Store headers at sibling path with .headers suffix
                const headersPath = `${responsePath}.headers`;
                storeDataAtPath(responseTarget, headersPath, responseHeaders);
                api.log("info", `Response headers stored at ${responseTarget}.${headersPath}`);
            }

            // Add to context for potential use in subsequent nodes (maintain backward compatibility)
            api.addToContext("cxoneApiResponse", result, "simple");

            // Output the result (always return node output as in MVP to avoid breaking flows)
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

            // Store error response in configured target/path
            if (responseTarget && responsePath) {
                storeDataAtPath(responseTarget, responsePath, errorResult.body);
                api.log("info", `Error response stored at ${responseTarget}.${responsePath}`);
            }

            // Add to context for backward compatibility
            api.addToContext("cxoneApiResponse", errorResult, "simple");

            // Output the error result
            api.output("Request failed", errorResult);
        }
    }
});