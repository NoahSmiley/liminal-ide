import type { FileReviewStatus } from "./change-types";

export interface GuidedStep {
  path: string;
  changeType: "created" | "modified";
  before: string | null;
  after: string;
  explanation: string;
  status: FileReviewStatus;
}

export interface GuidedSession {
  turnId: string;
  steps: GuidedStep[];
  currentIndex: number;
  animationDone: boolean;
}
