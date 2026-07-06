import * as fs from 'fs';
import * as path from 'path';
import { RecordedStep } from './models';

export type LinkedStepsMap = Record<string, RecordedStep[]>;

export class LinkedStepsManager {
    private filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    load(): LinkedStepsMap {
        try {
            if (!fs.existsSync(this.filePath)) return {};
            const raw = fs.readFileSync(this.filePath, 'utf-8');
            return JSON.parse(raw) as LinkedStepsMap;
        } catch {
            return {};
        }
    }

    save(map: LinkedStepsMap): void {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        fs.writeFileSync(this.filePath, JSON.stringify(map, null, 2), 'utf-8');
        console.log('[LinkedStepsManager] Guardado:', this.filePath);
    }

    merge(newEntries: LinkedStepsMap): void {
        const existing = this.load();
        this.save({ ...existing, ...newEntries });
    }

    getFilePath(): string {
        return this.filePath;
    }
}
