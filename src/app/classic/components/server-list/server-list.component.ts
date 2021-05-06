import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, OnChanges, Output, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSourceWithCustomSort } from '../../../core/matdatasource-custom';
import { ServerRow } from '../../models/server.interface';

const serverColumns = [];


@Component({
	selector: 'app-classic-server-list',
	templateUrl: './server-list.component.html',
	styleUrls: ['./server-list.component.scss'],
	// changeDetection: ChangeDetectionStrategy.OnPush
})
export class ServerListComponent implements OnInit, OnChanges {

	@Input() data: ServerRow[];
	@Input() columns: string[];
	@Output() rowSelected = new EventEmitter();
	@Output() rowActivated = new EventEmitter();
	selection: SelectionModel<ServerRow> = new SelectionModel<ServerRow>(false, []);

	dataSource: MatTableDataSourceWithCustomSort<ServerRow>;

	// @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;
	@ViewChild(MatSort, {static: true}) sort: MatSort;

	constructor(
		private cdr: ChangeDetectorRef
	) {}

	ngOnInit(): void {
		// Assign the data to the data source for the table to render
		this.dataSource = new MatTableDataSourceWithCustomSort(this.data);

		// this.dataSource.paginator = this.paginator;
		this.dataSource.sort = this.sort;
	}

	ngOnChanges(): void {
		if (this.dataSource !== undefined) {
			this.dataSource.data = this.data;
		}
	}

	selectRow(row: ServerRow): void {
		this.selection.select(row);
		this.rowSelected.emit(row);
	}

	isRowSelected(row: ServerRow): boolean {
		return this.selection.isSelected(row);
	}

	activateRow(row: ServerRow): void {
		this.rowActivated.emit(row);
	}
}
