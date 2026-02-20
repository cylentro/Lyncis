import Dexie, { type Table } from 'dexie';
import { JastipOrder, SenderAddress } from './types';

export class LyncisDatabase extends Dexie {
    orders!: Table<JastipOrder>;
    senderAddresses!: Table<SenderAddress>;

    constructor() {
        super('LyncisDB');
        this.version(1).stores({
            orders: '++id, tag, status, createdAt',
        });
        this.version(2).stores({
            orders: '++id, tag, status, createdAt, batchId',
            senderAddresses: '++id, label, isDefault',
        });
    }
}

export const db = new LyncisDatabase();
