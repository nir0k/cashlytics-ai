# Phase 9: Token Security - Research

**Researched:** 2026-02-25
**Domain:** Cryptographic Token Lifecycle Management for Password Reset
**Confidence:** HIGH

## Summary

Phase 9 implements secure token lifecycle management in `src/lib/auth/reset-token.ts`. The `password_reset_tokens` table (created in Phase 6) already provides the storage infrastructure with `tokenHash`, `expiresAt`, and `usedAt` columns. This phase focuses on the application-layer logic: generating 256-bit cryptographically random tokens, SHA-256 hashing before storage, validating with combined conditions, and consuming tokens atomically with password updates.

The critical insight is that **raw tokens never touch the database** — the email link contains the raw 64-char hex token, but only its SHA-256 hash is stored. This prevents full account takeover on any database breach. Single-use is enforced via `usedAt` timestamp (not deletion), preserving audit trail and enabling retry on partial failures.

**Primary recommendation:** Create `src/lib/auth/reset-token.ts` with four pure functions: `generateResetToken()`, `hashToken()`, `validateResetToken()`, and `consumeResetToken()`. All functions use Node.js built-in `crypto` module — no external packages needed.

<phase_requirements>

## Phase Requirements

| ID       | Description                                                                    | Research Support                                                                               |
| -------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| RESET-03 | Token is cryptographically secure (256-bit, `crypto.randomBytes`)              | `crypto.randomBytes(32)` produces 256 bits entropy — Node.js CSPRNG                            |
| RESET-04 | Reset token expires after 1 hour                                               | `expiresAt: new Date(Date.now() + 60 * 60 * 1000)` — enforced in validate query                |
| RESET-05 | Reset token is single-use (marked as used after successful reset)              | `usedAt` column set in `consumeResetToken()` — single query validation checks `isNull(usedAt)` |
| RESET-06 | Reset token is stored as SHA-256 hash in database (never raw token)            | `crypto.createHash("sha256").update(token).digest("hex")` before DB insert                     |
| RESET-10 | All other reset tokens are invalidated when user successfully changes password | `invalidateUserTokens(userId)` function sets `usedAt` on all user's pending tokens             |

</phase_requirements>

## Standard Stack

### Core

| Library          | Version  | Purpose                                         | Why Standard                                     |
| ---------------- | -------- | ----------------------------------------------- | ------------------------------------------------ |
| Node.js `crypto` | built-in | Cryptographic token generation, SHA-256 hashing | Native CSPRNG, zero dependencies, battle-tested  |
| Drizzle ORM      | existing | Database queries for token CRUD                 | Already in project, type-safe, familiar patterns |

### Supporting

| Library                 | Version  | Purpose                                        | When to Use          |
| ----------------------- | -------- | ---------------------------------------------- | -------------------- |
| `drizzle-orm` operators | existing | `eq`, `and`, `gt`, `isNull`, `sql` for queries | All token operations |

**Installation:** No new packages required — uses Node.js built-in `crypto` module.

## Architecture Patterns

### Recommended File Structure

```
src/lib/auth/
├── password.ts              # Existing — hashPassword, verifyPassword
├── registration-mode.ts     # Existing — registration mode check
├── require-auth.ts          # Existing — auth middleware
├── user-id.ts               # Existing — deprecated user ID helper
└── reset-token.ts           # NEW — token lifecycle functions
```

### Pattern 1: Token Generation with SHA-256 Hashing

**What:** Generate 256-bit token with `crypto.randomBytes(32)`, return both raw token (for email) and hash (for DB).

**When to use:** All password reset token creation — never use `Math.random()`, `uuid()`, or short `nanoid()`.

**Example:**

```typescript
import crypto from "node:crypto";

const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

export function generateResetToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
```

### Pattern 2: Single-Query Validation with All Conditions

**What:** Validate token with a single DB query that checks hash match, expiry, and unused status together.

**When to use:** All token validation — prevents timing attacks by avoiding sequential checks.

**Example:**

```typescript
import { db } from "@/lib/db";
import { passwordResetTokens } from "@/lib/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";

export async function validateResetToken(
  rawToken: string
): Promise<{ valid: true; userId: string; tokenId: string } | { valid: false }> {
  const tokenHash = hashToken(rawToken);

  const [record] = await db
    .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, new Date()),
        isNull(passwordResetTokens.usedAt)
      )
    )
    .limit(1);

  if (!record) return { valid: false };
  return { valid: true, userId: record.userId, tokenId: record.id };
}
```

### Pattern 3: Atomic Token Consumption

**What:** Mark token as used in the same transaction/operation as password update.

**When to use:** Always — ensures token cannot be replayed even if password update fails partially.

**Example:**

```typescript
export async function consumeResetToken(tokenId: string): Promise<void> {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenId));
}
```

### Pattern 4: Invalidate All User Tokens

**What:** When user successfully resets password, mark ALL their pending tokens as used.

**When to use:** After successful password reset — prevents multiple reset links from being valid simultaneously.

**Example:**

```typescript
export async function invalidateUserTokens(userId: string): Promise<void> {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
}
```

### Anti-Patterns to Avoid

- **Raw token in DB:** Storing the 64-char hex string directly enables account takeover on DB breach
- **Sequential validation:** `find token → check expiry → check used` leaks timing information
- **Deleting tokens:** Use `usedAt` timestamp instead — preserves audit trail and enables retry
- **Low entropy tokens:** Never use `Math.random()`, `Date.now()`, or short `nanoid()`

## Don't Hand-Roll

| Problem                 | Don't Build                  | Use Instead                   | Why                                                   |
| ----------------------- | ---------------------------- | ----------------------------- | ----------------------------------------------------- |
| Random token generation | Custom PRNG, `Math.random()` | `crypto.randomBytes(32)`      | CSPRNG required for security tokens                   |
| Token hashing           | MD5, custom hash             | `crypto.createHash("sha256")` | SHA-256 is standard, fast, preimage-resistant         |
| Token expiry            | Application-level timer      | DB column + query condition   | Survives server restarts, consistent across instances |

**Key insight:** All token security primitives are built into Node.js `crypto` module. No external packages needed.

## Common Pitfalls

### Pitfall 1: Raw Token Stored in Database

**What goes wrong:** The plaintext 64-char hex token is stored directly in `tokenHash` column. Database breach exposes all valid reset tokens.

**Why it happens:** Developers think "the token is already random, why hash it?" The parallel with password hashing isn't obvious.

**How to avoid:** Always hash before storage. The email URL contains raw token; DB stores only SHA-256 hash. Validation re-hashes incoming token and compares.

**Warning signs:**

- `tokenHash` column contains 64-char strings matching the raw token
- No `crypto.createHash` call in token creation
- Token lookup uses direct equality: `eq(tokens.tokenHash, rawToken)`

### Pitfall 2: Timing Attack on Token Validation

**What goes wrong:** Sequential checks (`find token → check expiry`) take different time for invalid vs valid-but-expired tokens, enabling oracle attacks.

**Why it happens:** Natural coding style separates concerns, but creates timing side-channel.

**How to avoid:** Single query with all conditions combined using `and()`. Return only valid/invalid — no distinction between "not found", "expired", or "already used".

**Warning signs:**

- Multiple sequential `if` checks after DB query
- Different error messages for "not found" vs "expired"
- DB query only checks `tokenHash`, application checks expiry separately

### Pitfall 3: Token Deletion Instead of Marking Used

**What goes wrong:** Token is `DELETE`d after use. If password update fails after deletion, user cannot retry — token is gone.

**Why it happens:** Feels cleaner to "clean up" used tokens immediately.

**How to avoid:** Set `usedAt = NOW()` instead of deleting. The `isNull(usedAt)` check in validation enforces single-use. Background cleanup can purge old tokens later.

**Warning signs:**

- `db.delete()` call in consume function
- No `usedAt` column or never updated
- Token table only contains unused tokens

### Pitfall 4: Other Tokens Not Invalidated on Password Reset

**What goes wrong:** User resets password, but their other pending reset tokens remain valid. Old intercepted links still work.

**Why it happens:** Only the consumed token is marked used; other tokens for same user are not touched.

**How to avoid:** Call `invalidateUserTokens(userId)` after successful password reset to mark ALL user's pending tokens as used.

**Warning signs:**

- Only `consumeResetToken(tokenId)` called after password update
- No query that updates by `userId`
- User can use old reset links after successful reset

## Code Examples

### Complete Token Lifecycle Module

```typescript
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { passwordResetTokens } from "@/lib/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";

const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

export function generateResetToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function createResetToken(userId: string): Promise<string> {
  const { raw, hash } = generateResetToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

  await db.insert(passwordResetTokens).values({
    tokenHash: hash,
    userId,
    expiresAt,
  });

  return raw;
}

export async function validateResetToken(
  rawToken: string
): Promise<{ valid: true; userId: string; tokenId: string } | { valid: false }> {
  const tokenHash = hashToken(rawToken);

  const [record] = await db
    .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, new Date()),
        isNull(passwordResetTokens.usedAt)
      )
    )
    .limit(1);

  if (!record) return { valid: false };
  return { valid: true, userId: record.userId, tokenId: record.id };
}

export async function consumeResetToken(tokenId: string): Promise<void> {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenId));
}

export async function invalidateUserTokens(userId: string): Promise<void> {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
}
```

### Usage in Server Action (Phase 10 Reference)

```typescript
export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const rawToken = formData.get("token") as string;
  const password = formData.get("password") as string;

  const validation = await validateResetToken(rawToken);
  if (!validation.valid) {
    return { error: "Ungültiger oder abgelaufener Link." };
  }

  const hashedPassword = await hashPassword(password);

  await db.transaction(async (tx) => {
    await tx.update(users).set({ password: hashedPassword }).where(eq(users.id, validation.userId));

    await invalidateUserTokens(validation.userId);
  });

  return { success: true };
}
```

## State of the Art

| Old Approach            | Current Approach      | When Changed  | Impact                         |
| ----------------------- | --------------------- | ------------- | ------------------------------ |
| MD5 token hashing       | SHA-256 hashing       | ~2015         | Preimage attacks on MD5        |
| Token in URL fragment   | Token in query param  | Always        | Fragments not sent to server   |
| Delete on use           | Mark `usedAt`         | Best practice | Preserves audit, enables retry |
| Per-request transporter | Singleton transporter | Phase 7       | Connection reuse               |

**Deprecated/outdated:**

- `Math.random()` for tokens: Never cryptographically secure
- UUID v4 for reset tokens: Only 122 bits entropy, version bits predictable
- Short tokens (<32 bytes): Brute-forceable with modern hardware

## Open Questions

1. **Should we add token cleanup for old records?**
   - What we know: `usedAt` tokens accumulate over time
   - What's unclear: When to clean up (cron, on insert, never for audit)
   - Recommendation: Defer to v2. For v1.1, let tokens accumulate — table will be small for self-hosted scale

2. **Should validation return more specific errors?**
   - What we know: "Invalid or expired" is the secure default
   - What's unclear: Whether UX needs "expired" vs "already used" distinction
   - Recommendation: Keep single error message. Prevents oracle attacks and is standard practice.

## Sources

### Primary (HIGH confidence)

- Node.js crypto.randomBytes: https://nodejs.org/api/crypto.html#cryptorandombytessize-callback
- Node.js crypto.createHash: https://nodejs.org/api/crypto.html#cryptocreatehashalgorithm-options
- OWASP Forgot Password Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- Existing schema: `src/lib/db/schema.ts` (lines 87-96) — passwordResetTokens table verified

### Secondary (MEDIUM confidence)

- Project research: `.planning/research/ARCHITECTURE.md` — token patterns documented
- Project pitfalls: `.planning/research/PITFALLS.md` — security considerations documented

### Tertiary (contextual)

- Phase 6 summary: `.planning/phases/06-database-schema/06-01-SUMMARY.md` — table structure confirmed

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — Node.js built-in crypto, no external dependencies
- Architecture: HIGH — Directly derived from existing research and schema
- Pitfalls: HIGH — Well-documented security patterns from OWASP and industry standards

**Research date:** 2026-02-25
**Valid until:** Stable — crypto module is Node.js core, no deprecation risk
