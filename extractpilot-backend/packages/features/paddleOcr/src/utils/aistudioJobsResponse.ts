type LayoutParsingPage = {
  markdown?: { text?: string };
};

type LayoutParsingResult = {
  layoutParsingResults?: LayoutParsingPage[];
};

export type AiStudioJobPollResponse = {
  data?: {
    state?: string;
    errorMsg?: string;
    resultUrl?: { jsonUrl?: string };
  };
};

export function parseJsonlMarkdownPages(jsonlText: string): string[] {
  const pages: string[] = [];
  for (const line of jsonlText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const row = JSON.parse(trimmed) as { result?: LayoutParsingResult };
    const results = row.result?.layoutParsingResults ?? [];
    for (const res of results) {
      const text = res.markdown?.text?.trim();
      if (text) pages.push(text);
    }
  }
  if (pages.length === 0) {
    throw new Error("AI Studio job JSONL contained no layoutParsingResults markdown");
  }
  return pages;
}
