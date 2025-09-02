import { TSServerClient } from '../tsserver/client.js';
import { ReferencesResponseBody } from '../tsserver/protocol.js';

export interface ReferencesArgs {
  file: string;
  line: number;
  offset: number;
}

export interface ReferencesResult {
  symbolName: string;
  symbolDisplayString: string;
  references: Array<{
    file: string;
    line: number;
    offset: number;
    endLine: number;
    endOffset: number;
    kind?: string;
    name?: string;
    containerKind?: string;
    containerName?: string;
  }>;
}

export async function getReferences(
  client: TSServerClient,
  args: ReferencesArgs,
): Promise<ReferencesResult | null> {
  await client.openFile(args.file);
  
  try {
    const response = await client.request<ReferencesResponseBody>('references', {
      file: args.file,
      line: args.line,
      offset: args.offset,
    });

    if (!response || !response.refs) {
      return null;
    }

    const references = response.refs.map(ref => ({
      file: ref.file,
      line: ref.start.line,
      offset: ref.start.offset,
      endLine: ref.end.line,
      endOffset: ref.end.offset,
      kind: ref.kind,
      name: ref.name,
      containerKind: ref.containerKind,
      containerName: ref.containerName,
    }));

    return {
      symbolName: response.symbolName,
      symbolDisplayString: response.symbolDisplayString,
      references,
    };
  } finally {
    await client.closeFile(args.file);
  }
}