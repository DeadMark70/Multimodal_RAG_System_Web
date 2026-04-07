const TOP_LEVEL_LIST_PATTERN = /^(?:[*+-]|\d+\.)\s+/;
const FENCE_PATTERN = /^\s*(```|~~~)/;
const BLOCK_BOUNDARY_PATTERN =
  /^(?:[*+-]|\d+\.)\s+|#{1,6}\s+|>\s+|---+$|\*\*\*+$|___+$|\|\s*.+\s*\|$/;

function isTopLevelListLine(line: string): boolean {
  return TOP_LEVEL_LIST_PATTERN.test(line);
}

function isFenceLine(line: string): boolean {
  return FENCE_PATTERN.test(line);
}

function isBlockBoundary(line: string): boolean {
  return BLOCK_BOUNDARY_PATTERN.test(line.trim());
}

export function normalizeMarkdown(content: string): string {
  if (!content) {
    return '';
  }

  const normalized = content.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const output: string[] = [];
  let inFence = false;

  for (const line of lines) {
    if (isFenceLine(line)) {
      inFence = !inFence;
      output.push(line);
      continue;
    }

    if (
      !inFence &&
      isTopLevelListLine(line) &&
      output.length > 0 &&
      output[output.length - 1].trim() !== ''
    ) {
      const previousLine = output[output.length - 1];
      if (!isBlockBoundary(previousLine)) {
        output.push('');
      }
    }

    output.push(line);
  }

  return output.join('\n');
}
