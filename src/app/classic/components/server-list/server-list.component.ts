import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatTableDataSourceWithCustomSort } from '../../../core/matdatasource-custom';

export interface ServerRow {
	name: string;
	ip: string;
	iwad: string;
	gametype: string;
	map: string;
	wads: string;
	ping: number;
	private: boolean;
	players: string;
}

const serverColumns = [];

const testData: ServerRow[] = [
	{name: 'Server 1', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: false, ping: 10, players: '0/16'},
	{name: 'Server 2', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: false, ping: 15, players: '0/16'},
	{name: 'Server 3', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: true, ping: 20, players: '0/16'},
	{name: 'Server 4', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: false, ping: 30, players: '0/16'},
	{name: 'Server 5', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: false, ping: 40, players: '0/16'},
	{name: 'Server 6', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: false, ping: 50, players: '0/16'},
	{name: 'Server 7', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: true, ping: 75, players: '0/16'},
	{name: 'Server 8', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: false, ping: 85, players: '0/16'},
	{name: 'Server 9', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: false, ping: 100, players: '0/16'},
	{name: 'Server 10', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: false, ping: 120, players: '0/16'},
	{name: 'Server 11', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: false, ping: 110, players: '0/16'},
	{name: 'Server 12', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: false, ping: 300, players: '0/16'},
	{name: 'Server 13', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: false, ping: 65, players: '0/16'},
	{name: 'Server 14', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: false, ping: 250, players: '0/16'},
	{name: 'Server 15', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: true, ping: 70, players: '0/16'},
	{name: 'Server 16', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: false, ping: 90, players: '0/16'},
	{name: 'Server 17', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: false, ping: 160, players: '0/16'},
	{name: 'Server 18', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: false, ping: 500, players: '0/16'},
	{name: 'Server 19', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: false, ping: 999, players: '0/16'},
	{name: 'Server 20', ip: '192.168.0.1', iwad: 'DOOM2', gametype: 'Deathmatch', map: 'MAP01', wads: '', private: false, ping: 999, players: '0/16'}
];

@Component({
	selector: 'app-classic-server-list',
	templateUrl: './server-list.component.html',
	styleUrls: ['./server-list.component.scss']
})
export class ServerListComponent implements OnInit {

	dataSource: MatTableDataSourceWithCustomSort<ServerRow>;
	displayedColumns = ['private', 'name', 'ping', 'players', 'gametype', 'iwad', 'wads', 'map', 'ip'];

	// @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;
	@ViewChild(MatSort, {static: true}) sort: MatSort;

	constructor() {
		// Assign the data to the data source for the table to render
		this.dataSource = new MatTableDataSourceWithCustomSort(testData);
	}

	ngOnInit(): void {
		// this.dataSource.paginator = this.paginator;
		this.dataSource.sort = this.sort;
	}
}
