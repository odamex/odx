import { Injectable } from '@angular/core';
import { OdalPapiService } from '../odalpapi-node/odalpapi.service';
import { OdalPapi } from '../odalpapi-node/odalpapi.models';
import { Observable, of } from 'rxjs';
import { first, tap } from 'rxjs/operators';


@Injectable({providedIn: 'root'})
export class ServerListService {

	constructor(
		private odal: OdalPapiService
	) {}

	/*refreshFromService() {
		this.servers = this.odal.queryMasterServer(masterList[0]).pipe(
			first(),
			tap((response: OdalPapi.ServerInfo[]) => {
				this.servers = response;
			})
		);
	}*/
}
