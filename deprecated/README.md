# Deprecated: Japan Post API Integration

## Why This Doesn't Work in Chrome Extensions

The Japan Post Digital Address API cannot be used directly from Chrome extensions due to:

1. **CORS Restrictions**: The Japan Post API doesn't include CORS headers that allow browser extensions to access it
2. **OAuth2 Limitations**: Chrome extensions cannot perform OAuth2 authentication to external APIs that don't explicitly support browser-based auth
3. **Network Error**: Results in `ERR_NAME_NOT_RESOLVED` when trying to connect

## What We Tried

- Created `japan-post-client.js` with full OAuth2 implementation
- Encrypted credentials using the same pattern as OpenAI keys
- Added API URLs to manifest.json CSP

## The Solution

**Backend Integration Required**: To use Japan Post API, it must be called from a backend server (like the form_filler backend) that can:
- Make server-to-server API calls without CORS restrictions
- Handle OAuth2 authentication properly
- Return results to the extension

## Current Solution

The Chrome extension now uses only ZipCloud API with:
- **NO 0001 fallback** - removed the problematic getBasePostalCode method
- Clear error messages when postal codes aren't found
- Users must enter addresses manually for corporate postal codes

## Files in This Folder

- `japan-post-client.js` - The client implementation (works on backend, not in extension)
- `encrypt-japan-post-key.js` - Credential encryption utility

These files are kept for reference if we want to implement a backend proxy service in the future.