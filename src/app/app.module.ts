import 'reflect-metadata';
import '../polyfills';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { HttpClientModule, HttpClient } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';

// NG Translate
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { ElectronService } from './shared/providers/electron.service';
import { WebviewDirective } from './core/directives/webview.directive';

// ngx-datatable
import { NgxDatatableModule } from '@swimlane/ngx-datatable';

// Odalpapi Node
import { OdalpapiNodeService } from '../../dist/odalpapi-node';

// ODX
import { MaterialModule } from './shared/material.module';
import { AppComponent } from './app.component';
import { WinTitleBarComponent } from './core/components/win-titlebar/win-titlebar.component';
import { ClassicLauncherComponent } from './classic/components/launcher/launcher.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServerListComponent } from './classic/components/server-list/server-list.component';
import { ServerInfoComponent } from './classic/components/server-info/server-info.component';
import { ToolbarComponent } from './classic/components/toolbar/toolbar.component';
import { PlayerListComponent } from './classic/components/player-list/player-list.component';
import { FooterComponent } from './classic/components/footer/footer.component';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
	return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
	declarations: [
		AppComponent,
		WinTitleBarComponent,
		ClassicLauncherComponent,
		WebviewDirective,
		ServerListComponent,
		ServerInfoComponent,
		ToolbarComponent,
		PlayerListComponent,
		FooterComponent
	],
	imports: [
		BrowserModule,
		FormsModule,
		HttpClientModule,
		AppRoutingModule,
		MaterialModule,
		NgxDatatableModule,
		TranslateModule.forRoot({
		loader: {
			provide: TranslateLoader,
			useFactory: (HttpLoaderFactory),
			deps: [HttpClient]
		}
		}),
		BrowserAnimationsModule
	],
	providers: [ElectronService, OdalpapiNodeService],
	bootstrap: [AppComponent]
})
export class AppModule { }
