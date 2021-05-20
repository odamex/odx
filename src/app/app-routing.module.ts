import { ClassicLauncherComponent } from './classic//components/launcher/launcher.component';
import { OverlayComponent } from './overlay/overlay.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
	{
		path: '',
		component: ClassicLauncherComponent
	}
];

@NgModule({
	imports: [RouterModule.forRoot(routes, {useHash: true})],
	exports: [RouterModule]
})
export class AppRoutingModule { }
