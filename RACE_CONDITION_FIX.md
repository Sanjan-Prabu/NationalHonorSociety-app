# BLE Organization Context Race Condition - FOUND THE BUG!

## 🎯 Root Cause Identified

The logs reveal a **race condition** between OrganizationContext loading and BLEProvider initialization.

### Evidence from Logs

**Member Device Timeline:**
1. ✅ Organization context loads successfully:
```
LOG  ✅ Set active organization: National Honor Society Associates
LOG  ✅ Organization context loaded successfully
```

2. ❌ But BLEProviderWrapper still sees undefined:
```
LOG  [BLEProviderWrapper] 🔄 Rendering with organization: {
  "hasActiveOrg": false, 
  "id": undefined, 
  "orgCode": 1, 
  "slug": undefined
}
```

3. ❌ Beacons are cached indefinitely:
```
LOG  [GlobalBLEManager] ⏳ Organization context not yet loaded, caching beacon 2-16738
```

4. ❌ Beacons are NEVER reprocessed because the organization context effect never triggers with a valid ID

## The Problem

The `BLEProviderWrapper` component is rendering **before** `activeOrganization` is set in the OrganizationContext. When the organization finally loads, the BLEProvider doesn't re-render with the new values because the props don't change (they're still undefined).

## The Solution

Add a loading check in `App.tsx` to wait for organization context before rendering BLEProvider:

```typescript
const BLEProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  const { activeOrganization, isLoading } = useOrganization();
  
  // WAIT for organization context to load
  if (isLoading) {
    console.log('[BLEProviderWrapper] ⏳ Waiting for organization context to load...');
    return <>{children}</>;  // Render children without BLE context while loading
  }
  
  const orgCode = activeOrganization?.slug 
    ? BLESessionService.getOrgCode(activeOrganization.slug as 'nhs' | 'nhsa')
    : 1;
  
  console.log('[BLEProviderWrapper] 🔄 Rendering with organization:', {
    id: activeOrganization?.id,
    slug: activeOrganization?.slug,
    orgCode,
    hasActiveOrg: !!activeOrganization
  });
  
  return (
    <BLEProvider
      organizationId={activeOrganization?.id}
      organizationSlug={activeOrganization?.slug}
      organizationCode={orgCode}
    >
      {children}
    </BLEProvider>
  );
};
```

## Why This Fixes It

1. **Prevents premature initialization**: BLEProvider won't be created until organization is loaded
2. **Ensures valid props**: When BLEProvider is created, it will have the correct organization ID
3. **Triggers reprocessing**: The organization context effect will fire with valid values
4. **Cached beacons processed**: Skipped beacons will be reprocessed immediately

## Alternative Solution (If isLoading doesn't exist)

If OrganizationContext doesn't have an `isLoading` flag, we can check for activeOrganization directly:

```typescript
const BLEProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  const { activeOrganization } = useOrganization();
  
  // Don't render BLE context until we have an organization
  if (!activeOrganization) {
    console.log('[BLEProviderWrapper] ⏳ No active organization yet, waiting...');
    return <>{children}</>;
  }
  
  const orgCode = BLESessionService.getOrgCode(activeOrganization.slug as 'nhs' | 'nhsa');
  
  console.log('[BLEProviderWrapper] ✅ Rendering BLE with organization:', {
    id: activeOrganization.id,
    slug: activeOrganization.slug,
    orgCode
  });
  
  return (
    <BLEProvider
      organizationId={activeOrganization.id}
      organizationSlug={activeOrganization.slug}
      organizationCode={orgCode}
    >
      {children}
    </BLEProvider>
  );
};
```

## Testing the Fix

After applying this fix:

1. **Member device logs should show**:
```
[BLEProviderWrapper] ⏳ No active organization yet, waiting...
... (organization loads) ...
[BLEProviderWrapper] ✅ Rendering BLE with organization: { id: '550e8400-...', slug: 'nhsa', orgCode: 2 }
[GlobalBLEManager] ✅ Organization context loaded successfully
```

2. **Beacons should be processed immediately**:
```
[GlobalBLEManager] 🔔 RAW BEACON DETECTED
[GlobalBLEManager] 🔍 Looking up session for beacon
[BLESessionService] ✅ MATCH FOUND! Session: "Work"
[GlobalBLEManager] ✅ ADDING SESSION TO DETECTED LIST
```

3. **Sessions should appear in UI** within 1-2 seconds

## Implementation

Apply this fix to `App.tsx`:
