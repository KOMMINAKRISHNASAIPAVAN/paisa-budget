import { Component, inject } from '@angular/core';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-transactions',
  imports: [],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss',
})
export class Transactions {
  private data = inject(DataService);

  // Expenses grouped by date — derived from shared service
  groupedTransactions = this.data.groupedByDate;
}
