import { TSServerClient } from '../tsserver/client.js';

export async function getDiagnostics(client: TSServerClient, args: { file: string }) {
  await client.openFile(args.file);

  try {
    const syntacticResponse = await client.request('syntacticDiagnosticsSync', {
      file: args.file,
      includeLinePosition: true,
    });

    const semanticResponse = await client.request('semanticDiagnosticsSync', {
      file: args.file,
      includeLinePosition: true,
    });

    return {
      syntactic: syntacticResponse || [],
      semantic: semanticResponse || [],
    };
  } finally {
    await client.closeFile(args.file);
  }
}
