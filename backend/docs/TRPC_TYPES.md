# tRPC Type Generation

This project uses code generation to create TypeScript types from the backend tRPC router, enabling full type safety across repositories.

## How it works

1. **Backend** defines tRPC routes with input/output schemas
2. **Code generation** extracts types from the router automatically
3. **Frontend** imports generated types for full type safety

## Generated Types

The backend generates `generated/trpc-types.ts` with:

- ✅ `AppRouter` - The complete router type
- ✅ `RouterInputs` - All input types for every route
- ✅ `RouterOutputs` - All output types for every route
- ✅ `LoginInput`, `SignupInput` etc. - Convenience types for common routes
- ✅ `TRPCSuccessResponse`, `TRPCErrorResponse` - Utility types

## Commands

### Backend

```bash
# Generate types manually
npm run generate-types

# Build (automatically generates types first)
npm run build
```

### Frontend

```typescript
// Import types
import type { LoginInput, UserOutput } from "./types/trpc";

// Use with full type safety
const loginData: LoginInput = {
  email: "user@example.com",
  password: "password123",
};

const user: UserOutput = await trpc.auth.me.query();
```

## Benefits

- 🎯 **Full type safety** - Frontend gets exact backend types
- 🔄 **Auto-sync** - Types update when backend changes
- 📦 **Multi-repo friendly** - Works across separate repositories
- 🚀 **Zero manual work** - Types are generated automatically
- ✨ **IntelliSense** - Perfect autocomplete and error checking

## File Structure

```
backend/
├── src/router.ts          # Source of truth for all routes
├── generated/
│   └── trpc-types.ts      # 🤖 Generated types (auto-created)
└── scripts/
    └── generate-trpc-types.js

frontend/
├── src/types/
│   └── trpc.ts            # Re-exports generated types
└── src/config/
    └── trpc.ts            # Uses generated AppRouter type
```
