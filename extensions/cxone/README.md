# CXone Extension

This Cognigy extension integrates with **CXone**, providing authenticated HTTP request capabilities for CXone API integration in your Cognigy flows.

## Prerequisites

- A CXone account with API access
- CXone connection credentials:
  - Environment URL (e.g., `https://cxone.niceincontact.com`)
  - Access Key ID and Access Key Secret
  - Client ID and Client Secret

## Installation

1. Build the extension:
   ```bash
   npm install
   npm run build
   ```

2. Upload the generated `cxone-*.tar.gz` file to your Cognigy.AI instance via **Manage > Extensions > Upload Extension**

## CXone Authenticated Call Node

Makes authenticated HTTP requests to any API using CXone bearer tokens.

### Features
- Automatic token injection from `input.data.cxonetoken` or `context.cxonetoken`
- Multiple HTTP methods (GET, POST, PUT, PATCH, DELETE)
- JSON, Text, and Form data payload types
- Configurable timeout (1-20 seconds, default 8s)
- Automatic retry with exponential backoff
- Request/response logging with sensitive data redaction
- Response header storage option
- Structured error handling

### Configuration
- **URL**: Complete endpoint URL
- **HTTP Method**: GET, POST, PUT, PATCH, DELETE
- **Headers**: Additional request headers (JSON format)
- **Payload**: JSON, text, or form data body
- **Timeout**: Request timeout in seconds
- **Retry**: Enable/disable automatic retry on failures
- **Debug Mode**: Enable detailed request/response logging

## Testing

This extension uses **Jest** for unit tests.

- **Run all tests**: `npm test`
- **Run tests in watch mode**: `npm run test:watch`

The test suite covers:
- Node descriptors in `src/nodes` (`authenticated-call.ts`) including success and error paths
- Helpers in `src/helpers` (`errors.ts`) to verify error handling and response formatting
- Jest is configured with coverage thresholds targeting near-100% coverage for helper modules

## Troubleshooting

### Common Issues

**Error: "Missing cxonetoken"**
- Ensure the flow is invoked by CXone with authentication token in `input.data.cxonetoken` or `context.cxonetoken`

**HTTP Error responses**
- Check the endpoint URL is correct and accessible
- Verify the HTTP method matches the API requirements
- Ensure request headers are properly formatted JSON

**Timeout errors**
- Increase the timeout value in node configuration (max 20 seconds)
- Check network connectivity to the target API

**Retry exhaustion**
- Check server availability and response times
- Verify API endpoint is not rate-limiting requests

## Development

### Building

```bash
npm install
npm run transpile
npm run lint
npm run build  # Includes transpile, lint, and zip
```

### Project Structure

```
src/
├── nodes/           # Node implementations (authenticated-call)
├── helpers/         # Utility functions (errors)
├── test-utils/      # Test utilities and mocks
└── types/           # TypeScript type definitions
```

## License

NiCE

## Author

NiCE
