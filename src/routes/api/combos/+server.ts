import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Este archivo está vacío porque los endpoints están en:
// POST /api/combos/items -> /api/combos/items/+server.ts
// DELETE /api/combos/[id]/items -> /api/combos/[id]/items/+server.ts
