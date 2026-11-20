# Love Moments — Security Specification (Phase 0)

## 1. Data Invariants
1. **Owner Integrity**: Every `experiences/{experienceId}` document must have `ownerId == request.auth.uid` on creation, and `ownerId` is immutable on update.
2. **Role Escalation Prevention**: Users creating their own `/users/{userId}` document must set `role == 'user'` and cannot elevate `role` on update.
3. **Time-Locked Future Letters**: Documents in `/experiences/{experienceId}/futureLetters/{letterId}` MUST NEVER be readable by non-owners/non-admins while `resource.data.unlockAt > request.time`.
4. **Private & Unlisted Isolation**: Private experiences (`visibility == 'private'`) are readable only by owner/admin. Unlisted experiences (`visibility == 'unlisted'`) can be fetched via `get` if published, but are blocked from `list` queries by non-owners.
5. **PII Isolation**: User profiles containing `email` are strictly readable and writable only by the profile owner or a verified admin.
6. **Temporal Integrity**: `createdAt` is verified against `request.time` on creation and immutable on update; `updatedAt` must equal `request.time` on update.
7. **Wish Moderation**: Visitors creating wishes must set `status` to `'pending'` or `'approved'` (when parent `moderationRequired == false`), and only experience owners or admins can moderate (`update`/`delete`) wishes.

## 2. Dirty Dozen Adversarial Payloads
1. **Self-Role Escalation**: User writes `{ uid: auth.uid, role: 'admin', ... }` to `/users/{uid}` -> `PERMISSION_DENIED`.
2. **Shadow Field Injection**: User creates `/experiences/{id}` with extra field `{ isFeaturedPro: true }` -> `PERMISSION_DENIED`.
3. **Owner Spoofing**: User A creates `/experiences/{id}` with `ownerId: 'userB'` -> `PERMISSION_DENIED`.
4. **Future Letter Early Read**: Visitor calls `get` on `/experiences/{id}/futureLetters/main` when `unlockAt > request.time` -> `PERMISSION_DENIED`.
5. **Private Experience Snooping**: Non-owner attempts `get` on experience with `visibility: 'private'` -> `PERMISSION_DENIED`.
6. **Unlisted Experience Scraping**: Non-owner runs `list` query on `/experiences` requesting unlisted documents -> `PERMISSION_DENIED`.
7. **PII Blanket Read**: Signed-in User A tries `get` or `list` on `/users/userB` -> `PERMISSION_DENIED`.
8. **ID Poisoning**: Attacker creates `/experiences/${'a'.repeat(500)}` -> `PERMISSION_DENIED` (`isValidId` rejects >128 chars).
9. **Timestamp Backdating**: Attacker creates `/experiences/{id}` with `createdAt` set 10 years in the past -> `PERMISSION_DENIED`.
10. **Wish Status Hijacking**: Visitor submits wish with `status: 'approved'` on a moderated experience -> `PERMISSION_DENIED`.
11. **Report Tampering**: Non-admin attempts `read` or `update` on `/reports/{reportId}` -> `PERMISSION_DENIED`.
12. **Platform Settings Hijack**: Regular user attempts `write` on `/platformSettings/global` -> `PERMISSION_DENIED`.
