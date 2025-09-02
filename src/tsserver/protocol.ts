export interface TSServerRequest {
  seq: number;
  type: 'request';
  command: string;
  arguments?: any;
}

export interface TSServerResponse {
  seq: number;
  type: 'response';
  command: string;
  request_seq: number;
  success: boolean;
  message?: string;
  body?: any;
}

export interface TSServerEvent {
  seq: number;
  type: 'event';
  event: string;
  body?: any;
}

export interface Position {
  line: number;
  offset: number;
}

export interface FileLocation extends Position {
  file: string;
}

export interface LocationRange {
  start: Position;
  end: Position;
}

export interface FileLocationRange extends LocationRange {
  file: string;
}

export interface DefinitionInfo {
  file: string;
  start: Position;
  end: Position;
  kind?: string;
  name?: string;
  containerKind?: string;
  containerName?: string;
}

export interface ReferencesResponseBody {
  refs: DefinitionInfo[];
  symbolName: string;
  symbolDisplayString: string;
  symbolStartOffset: number;
  symbolKind: string;
}

export interface QuickInfo {
  kind: string;
  kindModifiers: string;
  start: Position;
  end: Position;
  displayString: string;
  documentation: string;
  tags?: any[];
}

export interface RenameInfo {
  canRename: boolean;
  localizedErrorMessage?: string;
  displayName?: string;
  fullDisplayName?: string;
  kind?: string;
  kindModifiers?: string;
  triggerSpan?: LocationRange;
}

export interface SpanGroup {
  file: string;
  locs: LocationRange[];
}

export interface RenameResponseBody {
  info: RenameInfo;
  locs: SpanGroup[];
}

export interface OrganizeImportsResponseBody {
  edit: {
    applyChanges: boolean;
  };
}