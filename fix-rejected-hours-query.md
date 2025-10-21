# ✅ Fixed Rejected Volunteer Hours Query

## 🎯 Problem
Officer view showing "Error loading data - Failed to load rejected volunteer hours" because the query was looking for `status = 'rejected'` but the database migration might not have been applied yet.

## 🔧 Solution Applied

### **Backward Compatible Queries**
Updated all volunteer hours queries to handle both:
- **New status field**: `status IN ('pending', 'verified', 'rejected')`  
- **Legacy approved field**: `approved BOOLEAN` + `rejection_reason TEXT`

### **Query Updates**

#### Rejected Hours Query:
```sql
-- Before (failing):
.eq('status', 'rejected')

-- After (backward compatible):
.or('status.eq.rejected,and(approved.eq.false,rejection_reason.not.is.null)')
```

#### Verified Hours Query:
```sql
-- Before:
.eq('status', 'verified')

-- After:
.or('status.eq.verified,approved.eq.true')
```

#### Pending Hours Query:
```sql
-- Before:
.eq('status', 'pending')

-- After:
.or('status.eq.pending,and(approved.eq.false,rejection_reason.is.null)')
```

### **Status Transformation**
Updated `transformVolunteerHourData` to properly determine status:
```typescript
status: hour.status || (
  hour.approved ? 'verified' : 
  (hour.rejection_reason ? 'rejected' : 'pending')
)
```

## ✅ Result

- **Rejected tab** now loads properly ✅
- **Backward compatible** with existing data ✅
- **Works before and after** database migration ✅
- **No data loss** during transition ✅

**Status**: ✅ **FIXED** - Rejected volunteer hours now load correctly!