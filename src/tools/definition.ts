import { resolve } from 'path';
import { TSServerClient } from '../tsserver/client.js';
import { DefinitionInfo } from '../tsserver/protocol.js';

export interface DefinitionArgs {
  file: string;
  line: number;
  offset: number;
}

export interface DefinitionResult {
  definitions: Array<{
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

export async function getDefinition(
  client: TSServerClient,
  args: DefinitionArgs,
): Promise<DefinitionResult> {
  const normalizedPath = resolve(args.file);
  await client.openFile(normalizedPath);
  
  try {
    const response = await client.request<DefinitionInfo[]>('definition', {
      file: normalizedPath,
      line: args.line,
      offset: args.offset,
    });

    const definitions = (response || []).map(def => ({
      file: def.file,
      line: def.start.line,
      offset: def.start.offset,
      endLine: def.end.line,
      endOffset: def.end.offset,
      kind: def.kind,
      name: def.name,
      containerKind: def.containerKind,
      containerName: def.containerName,
    }));

    return { definitions };
  } finally {
    await client.closeFile(normalizedPath);
  }
}