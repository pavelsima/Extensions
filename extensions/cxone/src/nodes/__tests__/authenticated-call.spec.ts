/// <reference types="jest" />

import { cxoneAuthenticatedCall } from "../authenticated-call";
import { createMockCognigy } from "../../test-utils/mockCognigyApi";

// Mock fetch globally
global.fetch = jest.fn();

describe("cxoneAuthenticatedCall node", () => {
    let mockFetch: jest.MockedFunction<typeof fetch>;

    const baseConfig = {
        url: "https://api.example.com/test",
        method: "GET" as const,
        headers: {
            "Custom-Header": "test-value"
        },
        body: ""
    };

    beforeEach(() => {
        mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
        jest.clearAllMocks();
    });

    describe("successful requests", () => {
        it("should make a GET request with cxonetoken from input.data", async () => {
            const mockResponse = {
                status: 200,
                headers: new Map([["content-type", "application/json"]]),
                json: jest.fn().mockResolvedValue({ success: true, data: "test" })
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const cognigy = createMockCognigy({
                input: {
                    data: {
                        cxonetoken: "test-token-123"
                    }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: baseConfig as any
            } as any);

            expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/test", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Custom-Header": "test-value",
                    "Authorization": "Bearer test-token-123"
                }
            });

            expect(cognigy.api.output).toHaveBeenCalledWith(
                "Request completed successfully",
                {
                    status: 200,
                    body: { success: true, data: "test" }
                }
            );
        });

        it("should make a POST request with JSON body", async () => {
            const postConfig = {
                ...baseConfig,
                method: "POST" as const,
                body: { name: "test", value: 123 }
            };

            const mockResponse = {
                status: 201,
                headers: new Map([["content-type", "application/json"]]),
                json: jest.fn().mockResolvedValue({ id: 456 })
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const cognigy = createMockCognigy({
                input: {
                    data: {
                        cxonetoken: "test-token-456"
                    }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: postConfig as any
            } as any);

            expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/test", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Custom-Header": "test-value",
                    "Authorization": "Bearer test-token-456"
                },
                body: '{"name":"test","value":123}'
            });

            expect(cognigy.api.output).toHaveBeenCalledWith(
                "Request completed successfully",
                {
                    status: 201,
                    body: { id: 456 }
                }
            );
        });

        it("should handle text responses", async () => {
            const mockResponse = {
                status: 200,
                headers: new Map([["content-type", "text/plain"]]),
                text: jest.fn().mockResolvedValue("Plain text response")
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const cognigy = createMockCognigy({
                input: {
                    data: {
                        cxonetoken: "test-token-789"
                    }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: baseConfig as any
            } as any);

            expect(cognigy.api.output).toHaveBeenCalledWith(
                "Request completed successfully",
                {
                    status: 200,
                    body: "Plain text response"
                }
            );
        });

        it("should override user-provided Authorization header", async () => {
            const configWithAuth = {
                ...baseConfig,
                headers: {
                    "Authorization": "Bearer user-provided-token",
                    "Custom-Header": "test-value"
                }
            };

            const mockResponse = {
                status: 200,
                headers: new Map([["content-type", "application/json"]]),
                json: jest.fn().mockResolvedValue({ success: true })
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const cognigy = createMockCognigy({
                input: {
                    data: {
                        cxonetoken: "correct-token"
                    }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: configWithAuth as any
            } as any);

            expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/test", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Custom-Header": "test-value",
                    "Authorization": "Bearer correct-token" // Should be the cxonetoken, not user-provided
                }
            });
        });

        it("should handle string body for POST request", async () => {
            const postConfig = {
                ...baseConfig,
                method: "POST" as const,
                body: "raw string body"
            };

            const mockResponse = {
                status: 200,
                headers: new Map([["content-type", "application/json"]]),
                json: jest.fn().mockResolvedValue({ received: "ok" })
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const cognigy = createMockCognigy({
                input: {
                    data: {
                        cxonetoken: "test-token"
                    }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: postConfig as any
            } as any);

            expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/test", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Custom-Header": "test-value",
                    "Authorization": "Bearer test-token"
                },
                body: "raw string body"
            });
        });
    });

    describe("error handling", () => {
        it("should return structured error when cxonetoken is missing from both input and context", async () => {
            const cognigy = createMockCognigy({
                input: {
                    data: {} // No cxonetoken
                },
                context: {} // No cxonetoken in context either
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: baseConfig as any
            } as any);

            expect(mockFetch).not.toHaveBeenCalled();
            expect(cognigy.api.output).toHaveBeenCalledWith(
                "Authentication Error",
                {
                    error: "Missing cxonetoken in input.data or context.cxonetoken. This node can only be used in flows invoked by CXone with authentication.",
                    status: 401
                }
            );
            expect(cognigy.api.log).toHaveBeenCalledWith(
                "error",
                "Missing cxonetoken in input.data or context.cxonetoken. This node can only be used in flows invoked by CXone with authentication."
            );
        });

        it("should return structured error when cxonetoken is undefined in both locations", async () => {
            const cognigy = createMockCognigy({
                input: {
                    data: {
                        cxonetoken: undefined
                    }
                },
                context: {
                    cxonetoken: undefined
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: baseConfig as any
            } as any);

            expect(mockFetch).not.toHaveBeenCalled();
            expect(cognigy.api.output).toHaveBeenCalledWith(
                "Authentication Error",
                {
                    error: "Missing cxonetoken in input.data or context.cxonetoken. This node can only be used in flows invoked by CXone with authentication.",
                    status: 401
                }
            );
        });

        it("should handle fetch errors gracefully", async () => {
            mockFetch.mockRejectedValue(new Error("Network error"));

            const cognigy = createMockCognigy({
                input: {
                    data: {
                        cxonetoken: "test-token"
                    }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: baseConfig as any
            } as any);

            expect(cognigy.api.log).toHaveBeenCalledWith(
                "error",
                "CXone Authenticated Call error: Network error"
            );

            expect(cognigy.api.output).toHaveBeenCalledWith(
                "Request failed",
                {
                    status: 500,
                    body: {
                        error: "Network error"
                    }
                }
            );
        });

        it("should handle response parsing errors", async () => {
            const mockResponse = {
                status: 200,
                headers: new Map([["content-type", "application/json"]]),
                json: jest.fn().mockRejectedValue(new Error("Invalid JSON"))
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const cognigy = createMockCognigy({
                input: {
                    data: {
                        cxonetoken: "test-token"
                    }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: baseConfig as any
            } as any);

            expect(cognigy.api.output).toHaveBeenCalledWith(
                "Request failed",
                {
                    status: 500,
                    body: {
                        error: "Invalid JSON"
                    }
                }
            );
        });
    });

    describe("context.cxonetoken fallback", () => {
        it("should use token from context when input.data.cxonetoken is missing", async () => {
            const mockResponse = {
                status: 200,
                headers: new Map([["content-type", "application/json"]]),
                json: jest.fn().mockResolvedValue({ success: true })
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const cognigy = createMockCognigy({
                input: {
                    data: {} // No cxonetoken in input.data
                },
                context: {
                    cxonetoken: "context-token-123"
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: baseConfig as any
            } as any);

            expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/test", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Custom-Header": "test-value",
                    "Authorization": "Bearer context-token-123"
                }
            });

            expect(cognigy.api.log).toHaveBeenCalledWith(
                "info",
                "Using cxonetoken from context"
            );

            expect(cognigy.api.output).toHaveBeenCalledWith(
                "Request completed successfully",
                {
                    status: 200,
                    body: { success: true }
                }
            );
        });

        it("should prioritize input.data.cxonetoken over context.cxonetoken", async () => {
            const mockResponse = {
                status: 200,
                headers: new Map([["content-type", "application/json"]]),
                json: jest.fn().mockResolvedValue({ success: true })
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const cognigy = createMockCognigy({
                input: {
                    data: {
                        cxonetoken: "input-token-priority"
                    }
                },
                context: {
                    cxonetoken: "context-token-fallback"
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: baseConfig as any
            } as any);

            expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/test", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Custom-Header": "test-value",
                    "Authorization": "Bearer input-token-priority"
                }
            });

            expect(cognigy.api.log).toHaveBeenCalledWith(
                "info",
                "Using cxonetoken from input.data"
            );
        });

        it("should handle empty input.data and use context token", async () => {
            const mockResponse = {
                status: 201,
                headers: new Map([["content-type", "application/json"]]),
                json: jest.fn().mockResolvedValue({ created: true })
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const postConfig = {
                ...baseConfig,
                method: "POST" as const,
                body: { test: "data" }
            };

            const cognigy = createMockCognigy({
                input: {
                    data: null // Null input.data
                },
                context: {
                    cxonetoken: "context-fallback-token"
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: postConfig as any
            } as any);

            expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/test", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Custom-Header": "test-value",
                    "Authorization": "Bearer context-fallback-token"
                },
                body: '{"test":"data"}'
            });

            expect(cognigy.api.log).toHaveBeenCalledWith(
                "info",
                "Using cxonetoken from context"
            );
        });
    });

    describe("HTTP methods without body", () => {
        it("should not include body for GET request even if provided", async () => {
            const getConfigWithBody = {
                ...baseConfig,
                method: "GET" as const,
                body: { shouldNotBeIncluded: true }
            };

            const mockResponse = {
                status: 200,
                headers: new Map([["content-type", "application/json"]]),
                json: jest.fn().mockResolvedValue({ success: true })
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const cognigy = createMockCognigy({
                input: {
                    data: {
                        cxonetoken: "test-token"
                    }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: getConfigWithBody as any
            } as any);

            expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/test", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Custom-Header": "test-value",
                    "Authorization": "Bearer test-token"
                }
                // No body should be present
            });
        });

        it("should not include body for DELETE request", async () => {
            const deleteConfig = {
                ...baseConfig,
                method: "DELETE" as const,
                body: { shouldNotBeIncluded: true }
            };

            const mockResponse = {
                status: 204,
                headers: new Map(),
                text: jest.fn().mockResolvedValue("")
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const cognigy = createMockCognigy({
                input: {
                    data: {
                        cxonetoken: "test-token"
                    }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: deleteConfig as any
            } as any);

            expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/test", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Custom-Header": "test-value",
                    "Authorization": "Bearer test-token"
                }
                // No body should be present
            });
        });
    });

    describe("logging", () => {
        it("should log request details and completion", async () => {
            const mockResponse = {
                status: 200,
                headers: new Map([["content-type", "application/json"]]),
                json: jest.fn().mockResolvedValue({ success: true })
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const cognigy = createMockCognigy({
                input: {
                    data: {
                        cxonetoken: "test-token"
                    }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: baseConfig as any
            } as any);

            expect(cognigy.api.log).toHaveBeenCalledWith(
                "info",
                "Making GET request to: https://api.example.com/test"
            );
            expect(cognigy.api.log).toHaveBeenCalledWith(
                "info",
                "Executing GET request with Authorization header"
            );
            expect(cognigy.api.log).toHaveBeenCalledWith(
                "info",
                "Request completed with status: 200"
            );
        });
    });

    describe("response handling and storage", () => {
        const mockResponseWithHeaders = {
            status: 200,
            headers: new Map([
                ["content-type", "application/json"],
                ["x-custom-header", "custom-value"],
                ["server", "nginx/1.18.0"]
            ]),
            json: jest.fn().mockResolvedValue({ success: true, data: "test" })
        };

        beforeEach(() => {
            mockResponseWithHeaders.headers.forEach = jest.fn((callback) => {
                callback("application/json", "content-type", mockResponseWithHeaders.headers);
                callback("custom-value", "x-custom-header", mockResponseWithHeaders.headers);
                callback("nginx/1.18.0", "server", mockResponseWithHeaders.headers);
            });
        });

        it("should store response body in default context location", async () => {
            mockFetch.mockResolvedValue(mockResponseWithHeaders as any);

            const configWithDefaults = {
                ...baseConfig,
                responseTarget: "context",
                responseKey: "cxone.lastResponse"
            };

            const cognigy = createMockCognigy({
                input: {
                    data: { cxonetoken: "test-token" }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: configWithDefaults as any
            } as any);

            // Should store complete response object at specified key
            expect(cognigy.api.addToContext).toHaveBeenCalledWith(
                "cxone.lastResponse",
                {
                    status: 200,
                    body: { success: true, data: "test" }
                },
                "simple"
            );
        });

        it("should store response headers when enabled", async () => {
            mockFetch.mockResolvedValue(mockResponseWithHeaders as any);

            const configWithHeaders = {
                ...baseConfig,
                responseTarget: "context",
                responseKey: "cxone.apiCall",
                storeResponseHeaders: true
            };

            const cognigy = createMockCognigy({
                input: {
                    data: { cxonetoken: "test-token" }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: configWithHeaders as any
            } as any);

            // Should store complete response object including headers
            expect(cognigy.api.addToContext).toHaveBeenCalledWith(
                "cxone.apiCall",
                {
                    status: 200,
                    body: { success: true, data: "test" },
                    headers: {
                        "content-type": "application/json",
                        "x-custom-header": "custom-value",
                        "server": "nginx/1.18.0"
                    }
                },
                "simple"
            );
        });

        it("should store response in input target", async () => {
            mockFetch.mockResolvedValue(mockResponseWithHeaders as any);

            const configWithInput = {
                ...baseConfig,
                responseTarget: "input",
                responseKey: "api.lastCall"
            };

            const cognigy = createMockCognigy({
                input: {
                    data: { cxonetoken: "test-token" }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: configWithInput as any
            } as any);

            // Should store complete response object in input with specified key
            expect(cognigy.input["api.lastCall"]).toEqual({
                status: 200,
                body: { success: true, data: "test" }
            });
        });


        it("should handle error responses with new storage configuration", async () => {
            mockFetch.mockRejectedValue(new Error("Network timeout"));

            const configWithStorage = {
                ...baseConfig,
                responseTarget: "context",
                responseKey: "cxone.errorResponse"
            };

            const cognigy = createMockCognigy({
                input: {
                    data: { cxonetoken: "test-token" }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: configWithStorage as any
            } as any);

            // Should store complete error response in configured location
            expect(cognigy.api.addToContext).toHaveBeenCalledWith(
                "cxone.errorResponse",
                {
                    status: 500,
                    body: { error: "Network timeout" }
                },
                "simple"
            );

        });

        it("should not store headers when storeResponseHeaders is false", async () => {
            mockFetch.mockResolvedValue(mockResponseWithHeaders as any);

            const configWithoutHeaders = {
                ...baseConfig,
                responseTarget: "context",
                responseKey: "cxone.response",
                storeResponseHeaders: false
            };

            const cognigy = createMockCognigy({
                input: {
                    data: { cxonetoken: "test-token" }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: configWithoutHeaders as any
            } as any);

            // Should store complete response object without headers
            expect(cognigy.api.addToContext).toHaveBeenCalledWith(
                "cxone.response",
                {
                    status: 200,
                    body: { success: true, data: "test" }
                },
                "simple"
            );

            // Should NOT include headers in the response object
            expect(cognigy.api.addToContext).toHaveBeenCalledTimes(1); // Only one call for the main response
            const storedResponse = (cognigy.api.addToContext as jest.Mock).mock.calls[0][1];
            expect(storedResponse.headers).toBeUndefined();
        });

        it("should handle missing responsePath gracefully", async () => {
            mockFetch.mockResolvedValue(mockResponseWithHeaders as any);

            const configWithoutPath = {
                ...baseConfig,
                responseTarget: "context",
                responseKey: ""
            };

            const cognigy = createMockCognigy({
                input: {
                    data: { cxonetoken: "test-token" }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: configWithoutPath as any
            } as any);


            // Should output normally
            expect(cognigy.api.output).toHaveBeenCalledWith(
                "Request completed successfully",
                {
                    status: 200,
                    body: { success: true, data: "test" }
                }
            );
        });
    });

    describe("new payload type functionality", () => {
        it("should handle JSON payload type correctly", async () => {
            const postConfig = {
                ...baseConfig,
                method: "POST" as const,
                payloadType: "json" as const,
                bodyJson: { name: "test", value: 123 }
            };

            const mockResponse = {
                status: 201,
                headers: new Map([["content-type", "application/json"]]),
                json: jest.fn().mockResolvedValue({ id: 456 })
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const cognigy = createMockCognigy({
                input: {
                    data: {
                        cxonetoken: "test-token-456"
                    }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: postConfig as any
            } as any);

            expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/test", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Custom-Header": "test-value",
                    "Authorization": "Bearer test-token-456"
                },
                body: '{"name":"test","value":123}'
            });
        });

        it("should handle text payload type correctly", async () => {
            const postConfig = {
                ...baseConfig,
                method: "POST" as const,
                payloadType: "text" as const,
                bodyText: "plain text body"
            };

            const mockResponse = {
                status: 200,
                headers: new Map([["content-type", "text/plain"]]),
                text: jest.fn().mockResolvedValue("ok")
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const cognigy = createMockCognigy({
                input: {
                    data: {
                        cxonetoken: "test-token"
                    }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: postConfig as any
            } as any);

            expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/test", {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain",
                    "Custom-Header": "test-value",
                    "Authorization": "Bearer test-token"
                },
                body: "plain text body"
            });
        });

        it("should handle form data payload type correctly", async () => {
            const postConfig = {
                ...baseConfig,
                method: "POST" as const,
                payloadType: "form" as const,
                bodyForm: { username: "testuser", password: "secret123" }
            };

            const mockResponse = {
                status: 200,
                headers: new Map([["content-type", "application/json"]]),
                json: jest.fn().mockResolvedValue({ success: true })
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const cognigy = createMockCognigy({
                input: {
                    data: {
                        cxonetoken: "test-token"
                    }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: postConfig as any
            } as any);

            expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/test", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Custom-Header": "test-value",
                    "Authorization": "Bearer test-token"
                },
                body: "username=testuser&password=secret123"
            });
        });

        it("should store response using simple key format in context", async () => {
            const mockResponse = {
                status: 200,
                headers: new Map([["content-type", "application/json"]]),
                json: jest.fn().mockResolvedValue({ result: "success" })
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const configSimpleKey = {
                ...baseConfig,
                responseTarget: "context",
                responseKey: "myApiResult"
            };

            const cognigy = createMockCognigy({
                input: {
                    data: { cxonetoken: "test-token" }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: configSimpleKey as any
            } as any);

            // Should store complete response object using the simple key
            expect(cognigy.api.addToContext).toHaveBeenCalledWith(
                "myApiResult",
                {
                    status: 200,
                    body: { result: "success" }
                },
                "simple"
            );
        });

        it("should store response using simple key format in input", async () => {
            const mockResponse = {
                status: 200,
                headers: new Map([["content-type", "application/json"]]),
                json: jest.fn().mockResolvedValue({ result: "success" })
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const configInputKey = {
                ...baseConfig,
                responseTarget: "input",
                responseKey: "myApiResult"
            };

            const cognigy = createMockCognigy({
                input: {
                    data: { cxonetoken: "test-token" }
                }
            });

            await cxoneAuthenticatedCall.function({
                cognigy,
                config: configInputKey as any
            } as any);

            // Should store complete response object in input with the key
            expect(cognigy.input.myApiResult).toEqual({
                status: 200,
                body: { result: "success" }
            });
        });
    });
});