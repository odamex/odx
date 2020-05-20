import { Injectable } from '@angular/core';
import { OdalPapiService } from '../odalpapi-node/odalpapi.service';
import { OdalPapi } from '../odalpapi-node/odalpapi.models';
import { Observable, of } from 'rxjs';
import { first, tap } from 'rxjs/operators';


const masterList = [
	'208.97.140.174',
	'64.62.190.251'
];

const SERVER_CHALLENGE = Buffer.from('a3db0b00', 'hex');
const LAUNCHER_CHALLENGE = Buffer.from('021001ad510000000800000000000000', 'hex');

@Injectable({providedIn: 'root'})
export class MasterQueryService {

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

	query() {
		this.odal.queryMasterServer(masterList[0]);
	}
}
