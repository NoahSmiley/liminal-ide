import type { GitCommit } from "../../types/git-types";

interface GitCommitListProps {
  commits: GitCommit[];
}

export function GitCommitList({ commits }: GitCommitListProps) {
  if (commits.length === 0) {
    return <div className="text-[10px] text-zinc-600">no commits</div>;
  }

  return (
    <div className="overflow-y-auto">
      {commits.map((commit) => (
        <div
          key={commit.id}
          className="flex items-baseline gap-2 px-1 py-0.5 hover:bg-zinc-900/50"
        >
          <span className="text-[10px] text-cyan-700 font-mono shrink-0">
            {commit.id.slice(0, 7)}
          </span>
          <span className="text-[10px] text-zinc-400 truncate flex-1">
            {commit.message}
          </span>
          <span className="text-[10px] text-zinc-600 shrink-0">
            {commit.author}
          </span>
        </div>
      ))}
    </div>
  );
}
