export function formatOptionalNumber(value: number | null | undefined, digits = 3): string {
  return value == null || !Number.isFinite(value) ? 'N/A' : value.toFixed(digits);
}

export function formatOptionalPercent(value: number | null | undefined, digits = 1): string {
  return value == null || !Number.isFinite(value) ? 'N/A' : `${(value * 100).toFixed(digits)}%`;
}

export function formatOptionalTokens(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? 'N/A' : Math.round(value).toLocaleString();
}

export function formatOptionalText(value: string | null | undefined, fallback = 'N/A'): string {
  return value == null || value.trim() === '' ? fallback : value;
}
