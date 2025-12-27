import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { FileManagerService, IWADService } from '@shared/services';

@Component({
  selector: 'app-singleplayer',
  templateUrl: './singleplayer.component.html',
  styleUrl: './singleplayer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SingleplayerComponent {
  private fileManager = inject(FileManagerService);
  private iwadService = inject(IWADService);

  async launchOdamex() {
    try {
      const args: string[] = [];

      // Add WAD directories so client knows where to find IWADs
      const wadDirs = this.iwadService.wadDirectories();
      
      if (wadDirs.directories && wadDirs.directories.length > 0) {
        const dirPaths = wadDirs.directories.map(dir => dir.path);
        const separator = window.electron.platform === 'win32' ? ';' : ':';
        const wadDirPath = dirPaths.join(separator);
        args.push('-waddir', wadDirPath);
      }

      await this.fileManager.launchOdamex(args);
    } catch (error) {
      console.error('Failed to launch Odamex:', error);
    }
  }
}
