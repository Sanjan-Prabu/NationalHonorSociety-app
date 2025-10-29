# Windsurf MCP Configuration

This file contains the MCP configuration specifically for Windsurf IDE.

## Configuration Location

Add this configuration to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.supabase.com/mcp?project_ref=lncrggkgvstvlmrlykpi"
      ]
    }
  }
}
```

## Setup Instructions

### 1. Locate Your Windsurf MCP Config File

The configuration file should be at:
```
~/.codeium/windsurf/mcp_config.json
```

### 2. Create or Update the File

If the file doesn't exist, create it with the configuration above.

If it already exists, add the `supabase` server to the `mcpServers` object.

### 3. Restart Windsurf

After updating the configuration:
1. Save the file
2. Completely quit Windsurf
3. Restart Windsurf

### 4. Authentication

When Windsurf starts:
- It will automatically prompt you to login to Supabase
- A browser window will open
- Login to your Supabase account
- Grant access to the MCP client
- **Important**: Choose the organization that contains project `lncrggkgvstvlmrlykpi`

## Why mcp-remote?

Windsurf doesn't currently support remote MCP servers over HTTP transport directly. The `mcp-remote` package acts as a proxy to enable this functionality.

## Differences from Other AI IDEs

- **This config** (`WINDSURF_MCP_SETUP.md`): For Windsurf IDE using remote MCP server
- **mcp_config_template.json**: For other AI IDEs (Cursor, Claude Desktop, etc.) using local MCP server with access tokens

## Verification

After setup, you can verify the connection by:
1. Opening Windsurf
2. Checking the MCP panel/status
3. Looking for "supabase" server with "Connected" status

## Project Details

- **Project Reference**: `lncrggkgvstvlmrlykpi`
- **Server URL**: `https://mcp.supabase.com/mcp?project_ref=lncrggkgvstvlmrlykpi`
- **Authentication**: Browser-based OAuth (no manual PAT required)

## Capabilities

Once connected, the Supabase MCP server provides:
- Database schema introspection
- SQL query execution and validation
- RLS policy management
- Edge function deployment
- Migration management
- Real-time database operations
- Authentication management
- Storage bucket operations

## Troubleshooting

### Connection Failed
- Ensure `mcp-remote` package is accessible via `npx`
- Check your internet connection
- Verify the project reference is correct

### Authentication Issues
- Make sure you're logging into the correct Supabase organization
- Try clearing browser cookies and re-authenticating
- Check that your Supabase account has access to the project

### Server Not Showing
- Verify the config file path is correct
- Ensure JSON syntax is valid
- Restart Windsurf completely (not just reload window)

---

**Last Updated**: October 27, 2025
**Compatible With**: Windsurf IDE
**Project**: NHS/NHSA Volunteer Management App
