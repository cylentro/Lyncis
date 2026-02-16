import Dexie, { type Table } from 'dexie';
import { JastipOrder } from './types';

export class LyncisDatabase extends Dexie {
    orders!: Table<JastipOrder>;

    constructor() {
        super('LyncisDB');
        this.version(1).stores({
            orders: '++id, tag, status, createdAt',
        });
    }
}

export const db = new LyncisDatabase();
