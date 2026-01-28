# Step 2: Identity & Cohorts - In Progress

## What's Implemented So Far

### ✅ Database Schema Updated
- Changed `students` table from name/email to `handle`-based identity
- Added `cohorts` table with name, created_at, active
- Added `cohort_id` to: conversations, conversation_notes, conversation_tags, eval_results
- Added `archived` flag to conversations table
- Updated all TypeScript interfaces

### ✅ Database Reinitialized
- Databases recreated with new schema
- Default cohort created
- 84 availability slots maintained
- 10 KB articles maintained
- 3 test cases maintained
- 5 tags maintained

### ✅ API Routes Created

**Identity Routes:**
- `POST /api/identity/check` - Check if handle is available
- `POST /api/identity/register` - Register a new handle

**Cohort Routes:**
- `GET /api/cohorts` - List all cohorts
- `POST /api/cohorts` - Create new cohort
- `POST /api/cohorts/[id]/reset` - Reset a cohort (archive conversations, clear notes/tags/evals)

### ✅ Client-Side Infrastructure
- Created `IdentityContext` for managing student identity (localStorage + React context)
- Created `Providers` component to wrap app
- Updated root layout to include IdentityProvider

## 🚧 Still To Implement

### Remaining UI Components (30 min)

**1. Identity Selector Component** (`components/IdentitySelector.tsx`):
```typescript
'use client';

import { useState } from 'react';
import { useIdentity } from '@/lib/contexts/IdentityContext';

export function IdentitySelector() {
  const { setIdentity } = useIdentity();
  const [handle, setHandle] = useState('');
  const [selectedCohort, setSelectedCohort] = useState<number | null>(null);
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  // Fetch cohorts on mount
  useEffect(() => {
    fetch('/api/cohorts')
      .then(r => r.json())
      .then(data => {
        setCohorts(data.cohorts);
        // Auto-select active cohort
        const active = data.cohorts.find((c: any) => c.active);
        if (active) setSelectedCohort(active.id);
      });
  }, []);

  // Check handle availability as user types (debounced)
  const checkHandle = async (h: string) => {
    if (h.length < 3) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const res = await fetch('/api/identity/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: h }),
    });
    const data = await res.json();
    setAvailable(data.available);
    setChecking(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle || !selectedCohort) return;

    setLoading(true);
    setError('');

    const res = await fetch('/api/identity/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle, cohortId: selectedCohort }),
    });

    if (res.ok) {
      const data = await res.json();
      const cohort = cohorts.find((c: any) => c.id === selectedCohort);
      setIdentity(data.student, cohort);
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to register');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Welcome!</h2>
      <p className="text-gray-600 mb-6">Choose a unique handle to get started</p>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Your Handle
          </label>
          <input
            type="text"
            value={handle}
            onChange={(e) => {
              setHandle(e.target.value);
              checkHandle(e.target.value);
            }}
            className="w-full px-3 py-2 border rounded"
            placeholder="e.g., alice_learns"
            required
          />
          {checking && <p className="text-sm text-gray-500 mt-1">Checking...</p>}
          {available === true && <p className="text-sm text-green-600 mt-1">✓ Available!</p>}
          {available === false && <p className="text-sm text-red-600 mt-1">✗ Already taken</p>}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Select Cohort
          </label>
          <select
            value={selectedCohort || ''}
            onChange={(e) => setSelectedCohort(parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded"
            required
          >
            <option value="">Choose a cohort...</option>
            {cohorts.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.active ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading || !available || !selectedCohort}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Registering...' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
```

**2. Update Home Page** (`app/page.tsx`):
```typescript
'use client';

import { useIdentity } from '@/lib/contexts/IdentityContext';
import { IdentitySelector } from '@/components/IdentitySelector';
import Link from 'next/link';

export default function Home() {
  const { student, cohort, isLoading } = useIdentity();

  if (isLoading) {
    return <div className="text-center mt-16">Loading...</div>;
  }

  if (!student) {
    return <IdentitySelector />;
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Identity Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-8 rounded">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Logged in as</p>
            <p className="font-bold text-lg">@{student.handle}</p>
            <p className="text-sm text-gray-600">Cohort: {cohort?.name || 'None'}</p>
          </div>
          <button
            onClick={() => {
              if (confirm('Clear your identity? This will log you out.')) {
                localStorage.removeItem('student_identity');
                window.location.reload();
              }
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            Change Identity
          </button>
        </div>
      </div>

      {/* Rest of home page content... */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
        <h2 className="text-3xl font-bold mb-4">Welcome to Student Success Concierge</h2>
        {/* ... existing home page content ... */}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/admin/cohorts" className="block p-6 border-2 border-purple-200 rounded-lg hover:border-purple-400">
          <h3 className="text-xl font-semibold mb-2 text-purple-600">🔧 Admin</h3>
          <p className="text-gray-600">Manage cohorts and reset data</p>
        </Link>
      </div>
    </div>
  );
}
```

**3. Admin Cohort Management Page** (`app/admin/cohorts/page.tsx`):
```typescript
'use client';

import { useState, useEffect } from 'react';

export default function CohortsAdmin() {
  const [cohorts, setCohorts] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  const loadCohorts = async () => {
    const res = await fetch('/api/cohorts');
    const data = await res.json();
    setCohorts(data.cohorts);
  };

  useEffect(() => {
    loadCohorts();
  }, []);

  const createCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/cohorts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, active: true }),
    });
    if (res.ok) {
      setNewName('');
      await loadCohorts();
    }
    setLoading(false);
  };

  const resetCohort = async (id: number, name: string) => {
    if (!confirm(`Reset cohort "${name}"? This will archive all conversations and clear notes/tags/evals.`)) {
      return;
    }
    const res = await fetch(`/api/cohorts/${id}/reset`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      alert(data.message);
      await loadCohorts();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Cohort Management</h1>

      {/* Create Cohort */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New Cohort</h2>
        <form onSubmit={createCohort} className="flex gap-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Cohort name (e.g., Spring 2026)"
            className="flex-1 px-3 py-2 border rounded"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create
          </button>
        </form>
      </div>

      {/* Cohort List */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Existing Cohorts</h2>
        <div className="space-y-4">
          {cohorts.map((cohort: any) => (
            <div
              key={cohort.id}
              className="flex justify-between items-center p-4 border rounded"
            >
              <div>
                <h3 className="font-semibold">
                  {cohort.name}
                  {cohort.active && <span className="ml-2 text-sm text-green-600">(Active)</span>}
                </h3>
                <p className="text-sm text-gray-600">
                  Created: {new Date(cohort.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => resetCohort(cohort.id, cohort.name)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reset Cohort
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Testing & Verification

### Manual Tests

1. **Handle Registration:**
   ```
   - Visit http://localhost:3000
   - Should see identity selector
   - Enter handle "alice" → check availability
   - Select cohort
   - Click Continue
   - Should store in localStorage and show main page
   ```

2. **Handle Collision:**
   ```
   - Clear localStorage
   - Try to register same handle
   - Should show "already taken" error
   ```

3. **Cohort Management:**
   ```
   - Visit /admin/cohorts
   - Create new cohort "Test Cohort 2026"
   - Should appear in list
   - Click "Reset Cohort"
   - Confirm → should archive conversations
   ```

4. **Persistence:**
   ```
   - Register with handle
   - Refresh page
   - Should stay logged in
   - Clear localStorage → should show identity selector again
   ```

### Database Queries to Verify

```sql
-- Check students
SELECT * FROM students;

-- Check cohorts
SELECT * FROM cohorts;

-- Check a conversation has cohort_id
SELECT id, student_id, cohort_id, archived FROM conversations;

-- After reset, check archived
SELECT COUNT(*) FROM conversations WHERE archived = 1;
```

## Commands to Complete Step 2

```bash
# 1. Install dependencies (if needed)
npx pnpm install

# 2. Databases already reinitialized ✓

# 3. Create remaining UI files (see code above)
# - components/IdentitySelector.tsx
# - Update app/page.tsx
# - app/admin/cohorts/page.tsx

# 4. Start dev server
npx pnpm dev

# 5. Test in browser
# - http://localhost:3000
# - http://localhost:3000/admin/cohorts
```

## Files Created/Modified

### New Files (9):
1. `lib/db/appDb.ts` - Updated schema with cohorts
2. `lib/contexts/IdentityContext.tsx` - Identity management context
3. `app/providers.tsx` - Providers wrapper
4. `app/api/identity/check/route.ts` - Check handle availability
5. `app/api/identity/register/route.ts` - Register handle
6. `app/api/cohorts/route.ts` - List/create cohorts
7. `app/api/cohorts/[id]/reset/route.ts` - Reset cohort
8. `components/IdentitySelector.tsx` - Identity selection UI (to create)
9. `app/admin/cohorts/page.tsx` - Admin cohort management (to create)

### Modified Files (3):
1. `app/layout.tsx` - Added Providers
2. `app/page.tsx` - Add identity check (to update)
3. `scripts/init_dbs.ts` - Updated to create cohort instead of demo student

## Done Criteria

- [x] Database schema updated with cohorts and handle-based identity
- [x] Databases reinitialized
- [x] API routes created for identity and cohorts
- [x] Identity context provider created
- [ ] Identity selector UI created (code provided above)
- [ ] Home page updated to check identity (code provided above)
- [ ] Admin cohort management page created (code provided above)
- [ ] Tested handle registration flow
- [ ] Tested cohort creation
- [ ] Tested cohort reset
- [ ] Tested identity persistence (localStorage)
- [ ] Documentation updated

## Next Steps

1. Create the 3 remaining UI components using code above
2. Test all flows manually
3. Update PROJECT_MASTER.md with Step 2 changes
4. Update CHANGELOG.md
5. Create full STEP2_COMPLETE.md report
