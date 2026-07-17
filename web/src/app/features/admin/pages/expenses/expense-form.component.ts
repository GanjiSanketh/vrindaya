import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ExpenseService } from '../../services/expense.service';
import { CreateExpenseRequest, EXPENSE_CATEGORIES, EXPENSE_PAYMENT_STATUSES } from '../../models/expense.model';

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Component({
  selector:    'app-expense-form',
  standalone:  true,
  imports:     [FormsModule, RouterLink],
  templateUrl: './expense-form.component.html',
  styleUrl:    './expense-form.component.css',
})
export class ExpenseFormComponent {
  private readonly svc = inject(ExpenseService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly categories = EXPENSE_CATEGORIES;
  readonly paymentStatuses = EXPENSE_PAYMENT_STATUSES;
  readonly isEdit = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly expenseId = signal<string | null>(null);

  readonly model: CreateExpenseRequest = {
    expenseCategory: '',
    expenseType: '',
    vendor: '',
    description: '',
    amount: 0,
    gst: 0,
    paymentMethod: '',
    referenceNumber: '',
    invoiceNumber: '',
    expenseDate: toDateInputValue(new Date()),
    notes: '',
    paymentStatus: 'Paid',
  };

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.expenseId.set(id);
      void this.loadExpense(id);
    }
  }

  private async loadExpense(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const expense = await this.svc.getOne(id);
      this.model.expenseCategory = expense.expenseCategory;
      this.model.expenseType = expense.expenseType;
      this.model.vendor = expense.vendor ?? '';
      this.model.description = expense.description ?? '';
      this.model.amount = expense.amount;
      this.model.gst = expense.gst;
      this.model.paymentMethod = expense.paymentMethod ?? '';
      this.model.referenceNumber = expense.referenceNumber ?? '';
      this.model.invoiceNumber = expense.invoiceNumber ?? '';
      this.model.expenseDate = new Date(expense.expenseDate).toISOString().slice(0, 10);
      this.model.notes = expense.notes ?? '';
      this.model.paymentStatus = expense.paymentStatus ?? 'Paid';
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load expense.');
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    if (!this.model.expenseCategory || this.model.amount <= 0) {
      this.error.set('Category and Amount are required.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      const payload = {
        ...this.model,
        expenseDate: new Date(this.model.expenseDate + 'T00:00:00Z').toISOString(),
      };
      if (this.isEdit() && this.expenseId()) {
        await this.svc.update(this.expenseId()!, payload);
      } else {
        await this.svc.create(payload);
      }
      await this.router.navigate(['/admin/expenses']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not save expense.');
    } finally {
      this.saving.set(false);
    }
  }
}
