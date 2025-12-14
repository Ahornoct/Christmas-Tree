
export enum TreeMorphState {
  SCATTERED = 'SCATTERED',
  TREE_SHAPE = 'TREE_SHAPE'
}

export interface DualPosition {
  treePosition: [number, number, number];
  scatterPosition: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  speed: number; // Simulates weight/drag
}

export interface OrnamentData extends DualPosition {
  id: number;
  type: 'heavy' | 'light' | 'extra-light';
  color: string;
}

export interface PhotoData extends DualPosition {
  id: string;
  url: string;
  aspectRatio: number;
}
