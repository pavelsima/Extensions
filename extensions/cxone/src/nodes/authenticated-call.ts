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
        }
    ],

    form: [
        { type: "field", key: "method" },
        { type: "field", key: "url" },
        { type: "field", key: "headers" },
        { type: "field", key: "body" }
    ],

    appearance: {
        color: "#3694FD"
    },

    function: async ({ cognigy, config }: AuthenticatedCallNodeParams) => {
        const { url, method, headers = {}, body } = config;
        const { api, input } = cognigy;

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

            // Add to context for potential use in subsequent nodes
            api.addToContext("cxoneApiResponse", result, "simple");

            // Output the result
            api.output("Request completed successfully", result);

        } catch (error: any) {
            const errorMessage = error.message || "Unknown error occurred during HTTP request";
            api.log("error", `CXone Authenticated Call error: ${errorMessage}`);

            // Return structured error response
            const errorResult = {
                status: 500,
                body: {
                    error: errorMessage
                }
            };

            api.addToContext("cxoneApiResponse", errorResult, "simple");
            api.output("Request failed", errorResult);
        }
    }
});