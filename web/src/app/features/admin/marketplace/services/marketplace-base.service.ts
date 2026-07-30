import { signal, WritableSignal, inject } from '@angular/core';
import type {
  CollectionReference,
  DocumentReference,
  DocumentData,
  WhereFilterOp,
  OrderByDirection,
  QueryConstraint,
} from 'firebase/firestore';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { MarketplaceFirebaseService } from './marketplace-firebase.service';

export interface BaseDocument {
  id?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  isArchived?: boolean;
  archivedAt?: Date | null;
  version?: number;
}

export type DocData = Record<string, unknown>;

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortDirection?: OrderByDirection;
  filters?: { field: string; op: WhereFilterOp; value: unknown }[];
  search?: string;
  searchFields?: string[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export abstract class MarketplaceBaseService<T extends BaseDocument> {
  protected abstract readonly collectionName: string;
  protected readonly fb = inject(MarketplaceFirebaseService);

  protected colRef: CollectionReference<DocumentData> | null = null;

  readonly items: WritableSignal<T[]> = signal([]);
  readonly loading: WritableSignal<boolean> = signal(false);
  readonly error: WritableSignal<string | null> = signal(null);
  readonly total: WritableSignal<number> = signal(0);
  readonly currentPage: WritableSignal<number> = signal(1);
  readonly pageSize: WritableSignal<number> = signal(20);
  readonly selectedIds: WritableSignal<Set<string>> = signal(new Set());

  protected async col(): Promise<CollectionReference<DocumentData>> {
    if (this.colRef) return this.colRef;
    const db = await this.fb.getFirestore();
    this.colRef = collection(db, this.collectionName);
    return this.colRef;
  }

  protected docRef(id: string): Promise<DocumentReference<DocumentData>> {
    return this.col().then(c => doc(c, id));
  }

  protected abstract toModel(id: string, data: DocData): T;

  protected toDoc(model: Partial<T>): DocData {
    const { id: _id, ...rest } = model as Record<string, unknown>;
    return rest as DocData;
  }

  protected now(): Timestamp {
    return Timestamp.fromDate(new Date());
  }

  async getAll(options?: QueryOptions): Promise<PaginatedResult<T>> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const c = await this.col();
      const page = options?.page ?? 1;
      const size = options?.pageSize ?? this.pageSize();
      const sortField = options?.sortField ?? 'updatedAt';
      const sortDir = options?.sortDirection ?? 'desc';

      const constraints: QueryConstraint[] = [orderBy(sortField, sortDir)];

      if (options?.filters) {
        for (const f of options.filters) {
          constraints.push(where(f.field, f.op, f.value));
        }
      }

      const q = query(c, ...constraints);
      const snap = await getDocs(q);
      let all = snap.docs.map(d => this.toModel(d.id, d.data() as DocData));

      if (options?.search && options?.searchFields?.length) {
        const term = options.search.toLowerCase();
        all = all.filter(item =>
          options.searchFields!.some(field => {
            const val = (item as Record<string, unknown>)[field];
            return typeof val === 'string' && val.toLowerCase().includes(term);
          }),
        );
      }

      this.total.set(all.length);
      this.currentPage.set(page);
      this.pageSize.set(size);

      const totalPages = Math.max(1, Math.ceil(all.length / size));
      const start = (page - 1) * size;
      const paged = all.slice(start, start + size);

      this.items.set(paged);
      return { items: paged, total: all.length, page, pageSize: size, totalPages };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      this.error.set(msg);
      throw e;
    } finally {
      this.loading.set(false);
    }
  }

  async getById(id: string): Promise<T | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const r = await this.docRef(id);
      const snap = await getDoc(r);
      if (!snap.exists()) return null;
      return this.toModel(snap.id, snap.data() as DocData);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      this.error.set(msg);
      throw e;
    } finally {
      this.loading.set(false);
    }
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<T> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const c = await this.col();
      const now = this.now();
      const payload: DocData = {
        ...this.toDoc(data as Partial<T>),
        createdAt: now,
        updatedAt: now,
        version: 1,
        isArchived: false,
      };
      const ref = await addDoc(c, payload);
      const result = this.toModel(ref.id, { ...payload, id: ref.id });
      this.items.update(items => [result, ...items]);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      this.error.set(msg);
      throw e;
    } finally {
      this.loading.set(false);
    }
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const r = await this.docRef(id);
      const raw: DocData = {};
      const doc = this.toDoc(data);
      for (const key of Object.keys(doc)) {
        if (key !== 'id' && key !== 'createdAt') {
          raw[key] = doc[key];
        }
      }
      raw['updatedAt'] = this.now();
      await updateDoc(r, raw);

      let result: T;
      const existing = this.items().find(i => i.id === id);
      if (existing) {
        result = { ...existing, ...data, id, updatedAt: new Date() } as T;
      } else {
        const snap = await getDoc(r);
        result = this.toModel(snap.id, snap.data() as DocData);
      }

      this.items.update(items => items.map(i => (i.id === id ? result : i)));
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      this.error.set(msg);
      throw e;
    } finally {
      this.loading.set(false);
    }
  }

  async delete(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const r = await this.docRef(id);
      await deleteDoc(r);
      this.items.update(items => items.filter(i => i.id !== id));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      this.error.set(msg);
      throw e;
    } finally {
      this.loading.set(false);
    }
  }

  async archive(id: string): Promise<T> {
    return this.update(id, { isArchived: true, archivedAt: new Date() } as Partial<T>);
  }

  async restore(id: string): Promise<T> {
    return this.update(id, { isArchived: false, archivedAt: null } as unknown as Partial<T>);
  }

  async duplicate(id: string, overrides?: Partial<T>): Promise<T> {
    const original = await this.getById(id);
    if (!original) throw new Error(`Document ${id} not found`);
    const { id: _id, createdAt: _c, updatedAt: _u, version: _v, isArchived: _a, archivedAt: _aa, createdBy: _cb, updatedBy: _ub, ...data } = original;
    return this.create({ ...data, ...overrides } as unknown as Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version'>);
  }

  async bulkCreate(items: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version'>>): Promise<T[]> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const db = await this.fb.getFirestore();
      const c = await this.col();
      const batch = writeBatch(db);
      const now = this.now();
      const results: { ref: DocumentReference; payload: DocData }[] = [];

      for (const item of items) {
        const ref = doc(c);
        const payload: DocData = {
          ...this.toDoc(item as Partial<T>),
          createdAt: now,
          updatedAt: now,
          version: 1,
          isArchived: false,
        };
        batch.set(ref, payload);
        results.push({ ref, payload });
      }

      await batch.commit();
      const output: T[] = results.map(r => this.toModel(r.ref.id, r.payload));
      this.items.update(current => [...output, ...current]);
      return output;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      this.error.set(msg);
      throw e;
    } finally {
      this.loading.set(false);
    }
  }

  async bulkUpdate(updates: { id: string; data: Partial<T> }[]): Promise<T[]> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const db = await this.fb.getFirestore();
      const batch = writeBatch(db);
      const ts = this.now();

      for (const u of updates) {
        const r = await this.docRef(u.id);
        const raw: DocData = {};
        const docData = this.toDoc(u.data);
        for (const key of Object.keys(docData)) {
          if (key !== 'id' && key !== 'createdAt') {
            raw[key] = docData[key];
          }
        }
        raw['updatedAt'] = ts;
        batch.update(r, raw);
      }

      await batch.commit();

      const results: T[] = [];
      for (const u of updates) {
        const snap = await getDoc(await this.docRef(u.id));
        if (snap.exists()) {
          results.push(this.toModel(snap.id, snap.data() as DocData));
        }
      }

      this.items.update(current => current.map(i => {
        const updated = results.find(r => r.id === i.id);
        return updated ?? i;
      }));
      return results;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      this.error.set(msg);
      throw e;
    } finally {
      this.loading.set(false);
    }
  }

  async bulkDelete(ids: string[]): Promise<void> {
    const db = await this.fb.getFirestore();
    const batch = writeBatch(db);
    for (const id of ids) {
      const r = await this.docRef(id);
      batch.delete(r);
    }
    await batch.commit();
    this.items.update(items => items.filter(i => i.id && !ids.includes(i.id)));
  }

  async bulkArchive(ids: string[]): Promise<void> {
    const db = await this.fb.getFirestore();
    const batch = writeBatch(db);
    const ts = this.now();
    const nowDate = new Date();
    for (const id of ids) {
      const r = await this.docRef(id);
      batch.update(r, { isArchived: true, archivedAt: ts, updatedAt: ts });
    }
    await batch.commit();
    this.items.update(items => items.map(i =>
      ids.includes(i.id!) ? { ...i, isArchived: true, archivedAt: nowDate, updatedAt: nowDate } as unknown as T : i,
    ));
  }

  async bulkRestore(ids: string[]): Promise<void> {
    const db = await this.fb.getFirestore();
    const batch = writeBatch(db);
    const ts = this.now();
    const nowDate = new Date();
    for (const id of ids) {
      const r = await this.docRef(id);
      batch.update(r, { isArchived: false, archivedAt: null, updatedAt: ts });
    }
    await batch.commit();
    this.items.update(items => items.map(i =>
      ids.includes(i.id!) ? { ...i, isArchived: false, archivedAt: null, updatedAt: nowDate } as unknown as T : i,
    ));
  }

  toggleSelection(id: string): void {
    this.selectedIds.update(ids => {
      const next = new Set(ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  selectAll(): void {
    this.selectedIds.update(() => new Set(this.items().filter(i => i.id).map(i => i.id!)));
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }
}
