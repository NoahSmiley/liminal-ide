export interface CollabStatus {
  connected: boolean;
  room_id: string | null;
}

export interface RemoteCursor {
  user_name: string;
  file: string;
  line: number;
  col: number;
}
