export interface SearchMatch {
  line_number: number;
  line_content: string;
}

export interface SearchResult {
  path: string;
  matches: SearchMatch[];
}
