// Node.ts
export enum NodeType {
  Folder = "folder",
  File = "file",
}

export interface BaseNode {
  id: string;
  name: string;
  parent?: Folder;
  type: NodeType;
}

export interface Folder extends BaseNode {
  type: NodeType.Folder;
  children: Record<string, Node>;
}

function addFile(folder: Folder, node: Node): void {}

export interface File extends BaseNode {
  type: NodeType.File;
  size: number;
  mimeType: string;
}

export type Node = Folder | File;
