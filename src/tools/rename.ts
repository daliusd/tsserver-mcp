import { TSServerClient } from '../tsserver/client.js';
import { RenameResponseBody } from '../tsserver/protocol.js';

export interface RenameArgs {
  file: string;
  line: number;
  offset: number;
  newName: string;
}

export interface RenameResult {
  canRename: boolean;
  localizedErrorMessage?: string;
  displayName?: string;
  fullDisplayName?: string;
  kind?: string;
  changes?: Array<{
    file: string;
    edits: Array<{
      startLine: number;
      startOffset: number;
      endLine: number;
      endOffset: number;
      newText: string;
    }>;
  }>;
}

export async function getRename(
  client: TSServerClient,
  args: RenameArgs,
): Promise<RenameResult> {
  await client.openFile(args.file);
  
  try {
    const response = await client.request<RenameResponseBody>('rename', {
      file: args.file,
      line: args.line,
      offset: args.offset,
    });

    if (!response || !response.info || !response.info.canRename) {
      return {
        canRename: false,
        localizedErrorMessage: response?.info?.localizedErrorMessage || 'Cannot rename symbol',
      };
    }

    const changes = response.locs.map(spanGroup => ({
      file: spanGroup.file,
      edits: spanGroup.locs.map(loc => ({
        startLine: loc.start.line,
        startOffset: loc.start.offset,
        endLine: loc.end.line,
        endOffset: loc.end.offset,
        newText: args.newName,
      })),
    }));

    return {
      canRename: true,
      displayName: response.info.displayName,
      fullDisplayName: response.info.fullDisplayName,
      kind: response.info.kind,
      changes,
    };
  } finally {
    await client.closeFile(args.file);
  }
}