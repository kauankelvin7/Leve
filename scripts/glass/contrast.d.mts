import type { Page } from '@playwright/test';
export type ContrastMeasurement = { status: 'UNMEASURED'; reason: string } | { status: 'PASS' | 'FAIL'; minimumRatio: number; requiredRatio: number; samples: number };
export function measureIncompleteContrast(page: Page, target: readonly (string | string[])[]): Promise<ContrastMeasurement>;
