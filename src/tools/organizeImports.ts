import { TSServerClient } from '../tsserver/client.js';

export interface OrganizeImportsArgs {
  file: string;
}

export interface OrganizeImportsResult {
  success: boolean;
  changes?: Array<{
    newText: string;
    span: {
      startLine: number;
      startOffset: number;
      endLine: number;
      endOffset: number;
    };
  }>;
}

export async function organizeImports(
  client: TSServerClient,
  args: OrganizeImportsArgs,
): Promise<OrganizeImportsResult> {
  await client.openFile(args.file);
  
  try {
    const response = await client.request('organizeImports', {
      file: args.file,
    });

    if (!response || !response.length) {
      return { success: false };
    }

    const changes = response.map((change: any) => ({
      newText: change.newText || '',
      span: {
        startLine: change.span.start.line,
        startOffset: change.span.start.offset,
        endLine: change.span.end.line,
        endOffset: change.span.end.offset,
      },
    }));

    return {
      success: true,
      changes,
    };
  } catch (error) {
    console.error('Error organizing imports:', error);
    return { success: false };
  } finally {
    await client.closeFile(args.file);
  }
}