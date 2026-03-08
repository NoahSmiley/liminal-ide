import type { SidebarTab } from "../../stores/ui-store";
import { FileTreePanel } from "../file-viewer/file-tree-panel";
import { SearchPanel } from "./search-panel";
import { GitPanel } from "./git-panel";
import { PluginPanel } from "./plugin-panel";
import type { TreeNode } from "../../types/fs-types";
import type { SearchResult } from "../../types/search-types";
import type { PluginManifest } from "../../types/plugin-types";

export interface SidebarProps {
  tab: SidebarTab;
  onClose: () => void;
  fileTree: { nodes: TreeNode[]; onSelect: (node: TreeNode) => void; onExpand: (path: string) => void; onCreateFile: (path: string) => void; onPinFile: (path: string) => void };
  search: { results: SearchResult[]; loading: boolean; query: string; caseSensitive: boolean; useRegex: boolean; search: (q: string) => void; clear: () => void; setCaseSensitive: (v: boolean) => void; setUseRegex: (v: boolean) => void };
  onOpenFileAt: (path: string, line: number) => void;
  gitOnSelectFile: (path: string) => void;
  plugins: { plugins: PluginManifest[]; refresh: () => void; runCommand: (p: string, c: string) => Promise<string> };
}

export function Sidebar({
  tab,
  onClose,
  fileTree,
  search,
  onOpenFileAt,
  gitOnSelectFile,
  plugins,
}: SidebarProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {tab === "files" && (
        <FileTreePanel
          nodes={fileTree.nodes}
          onSelect={fileTree.onSelect}
          onExpand={fileTree.onExpand}
          onCreateFile={fileTree.onCreateFile}
          onPinFile={fileTree.onPinFile}
        />
      )}
      {tab === "search" && (
        <SearchPanel
          results={search.results}
          loading={search.loading}
          query={search.query}
          caseSensitive={search.caseSensitive}
          useRegex={search.useRegex}
          onSearch={search.search}
          onClear={search.clear}
          onToggleCase={() => search.setCaseSensitive(!search.caseSensitive)}
          onToggleRegex={() => search.setUseRegex(!search.useRegex)}
          onOpenFileAt={onOpenFileAt}
          onClose={onClose}
        />
      )}
      {tab === "git" && (
        <GitPanel onSelectFile={gitOnSelectFile} />
      )}
      {tab === "plugins" && (
        <PluginPanel
          plugins={plugins.plugins}
          onRunCommand={plugins.runCommand}
          onRefresh={plugins.refresh}
        />
      )}
    </div>
  );
}
