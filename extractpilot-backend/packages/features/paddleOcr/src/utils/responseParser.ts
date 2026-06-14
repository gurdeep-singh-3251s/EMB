type LayoutParsingPage = {
  markdown?: { text?: string };
};

export type LayoutParsingResponse = {
  errorCode?: number;
  errorMsg?: string;
  result?: {
    layoutParsingResults?: LayoutParsingPage[];
  };
};

export function extractPagesFromResponse(body: LayoutParsingResponse): string[] {
  const pages = body.result?.layoutParsingResults ?? [];
  return pages.map((page, index) => {
    const text = page.markdown?.text?.trim();
    if (!text) {
      throw new Error(`PaddleOCR returned empty text for page ${index + 1}`);
    }
    return text;
  });
}

export function assertSuccessResponse(body: LayoutParsingResponse, status: number): void {
  if (status !== 200) {
    throw new Error(body.errorMsg ?? `PaddleOCR request failed with status ${status}`);
  }

  if (body.errorCode !== undefined && body.errorCode !== 0) {
    throw new Error(body.errorMsg ?? `PaddleOCR error code ${body.errorCode}`);
  }
}
