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

            expect(cognigy.api.addToContext).toHaveBeenCalledWith(
                "cxoneApiResponse",
                {
                    status: 200,
                    body: { success: true, data: "test" }
                },
                "simple"
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

            expect(cognigy.api.addToContext).toHaveBeenCalledWith(
                "cxoneApiResponse",
                {
                    status: 500,
                    body: {
                        error: "Network error"
                    }
                },
                "simple"
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
});