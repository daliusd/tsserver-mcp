import { resolve } from 'path';
import { TSServerClient } from '../tsserver/client.js';
import { QuickInfo } from '../tsserver/protocol.js';

export interface HoverArgs {
  file: string;
  line: number;
  offset: number;
}

export interface HoverResult {
  contents: string;
  range?: {
    startLine: number;
    startOffset: number;
    endLine: number;
    endOffset: number;
  };
}

export async function getHover(
  client: TSServerClient,
  args: HoverArgs,
): Promise<HoverResult | null> {
  const normalizedPath = resolve(args.file);
  await client.openFile(normalizedPath);
  
  try {
    const response = await client.request<QuickInfo>('quickinfo', {
      file: normalizedPath,
      line: args.line,
      offset: args.offset,
    });

    if (!response) {
      return null;
    }

    let contents = '';
    if (response.displayString) {
      contents += `\`\`\`typescript\n${  response.displayString  }\n\`\`\``;
    }
    if (response.documentation) {
      if (contents) {
contents += '\n\n';
}
      contents += response.documentation;
    }

    const result: HoverResult = { contents };
    
    if (response.start && response.end) {
      result.range = {
        startLine: response.start.line,
        startOffset: response.start.offset,
        endLine: response.end.line,
        endOffset: response.end.offset,
      };
    }

    return result;
  } catch {
    // Handle TSServer errors gracefully for invalid positions
    return null;
  } finally {
    await client.closeFile(normalizedPath);
  }
}