import { expandGlob } from "@/deps.ts";
import type { Migration, MigrationProvider } from "@/deps.ts";

export class VersionFileMigrationProvider implements MigrationProvider {
  readonly #props: VersionFileMigrationProviderProps;

  constructor(props: VersionFileMigrationProviderProps) {
    this.#props = props;
  }

  async getMigrations(): Promise<Record<string, Migration>> {
    const migrations: Record<string, Migration> = {};

    const versionFolders = await Array.fromAsync(
      expandGlob(`${this.#props.migrationFolder}/v*`, {
        includeDirs: true,
      }),
    );

    versionFolders.sort();

    for (const folder of versionFolders) {
      if (!folder.isDirectory) {
        continue;
      }

      const files = await this.#props.fs.readdir(folder.path);

      for (const fileName of files) {
        if (
          fileName.endsWith(".js") ||
          (fileName.endsWith(".ts") && !fileName.endsWith(".d.ts")) ||
          fileName.endsWith(".mjs") ||
          (fileName.endsWith(".mts") && !fileName.endsWith(".d.mts"))
        ) {
          const migration = await import(
            /* webpackIgnore: true */ this.#props.path.join(
              this.#props.migrationFolder,
              folder.name,
              fileName,
            )
          );
          const migrationKey = fileName.substring(0, fileName.lastIndexOf("."));

          migrations[migrationKey] = migration;
        }
      }
    }

    return migrations;
  }
}
export interface FileMigrationProviderFS {
  readdir(path: string): Promise<string[]>;
}

export interface FileMigrationProviderPath {
  join(...path: string[]): string;
}

export interface VersionFileMigrationProviderProps {
  fs: FileMigrationProviderFS;
  path: FileMigrationProviderPath;
  migrationFolder: string;
}
