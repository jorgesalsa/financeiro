/**
 * @deprecated This service creates OfficialEntry directly, bypassing the staging pipeline.
 * The canonical implementation is the cron endpoint at /api/cron/recurring-entries
 * which correctly creates StagingEntry with AUTO_CLASSIFIED status.
 *
 * DO NOT use this function — it exists only for backward compatibility reference.
 * Use the cron endpoint instead.
 */

// This file intentionally left empty.
// The recurring entry generation logic lives in /api/cron/recurring-entries/route.ts
// which creates StagingEntry (correct pipeline) instead of OfficialEntry (bypass).
