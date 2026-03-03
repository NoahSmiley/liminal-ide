export interface PluginCommand {
  name: string;
  description: string;
  script: string;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  commands: PluginCommand[];
}
