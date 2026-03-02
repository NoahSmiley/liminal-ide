import type { Timestamp } from "./common";

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
