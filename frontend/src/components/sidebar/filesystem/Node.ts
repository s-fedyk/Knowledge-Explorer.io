
// Node.ts
export enum NodeType {
  Folder = 'folder',
  File   = 'file',
}

export interface BaseNode {
  id: string
  name: string
  parent?: Folder
  type: NodeType
}

export interface Folder extends BaseNode {
  type: NodeType.Folder
  children: Node[]
}

export interface File extends BaseNode {
  type: NodeType.File
  size: number
  mimeType: string
}

export type Node = Folder | File

