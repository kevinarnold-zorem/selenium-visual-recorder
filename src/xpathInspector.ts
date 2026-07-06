import { BrowserWindow } from 'electron';
import { DriverManager } from './driverManager';
import { exec } from 'child_process';
import * as os from 'os';

const INSPECTOR_JS = `
window.__recordedXPath = null;
window.__recordedTag   = null;

function getSmartXPath(el) {
    if (el.id) return '//*[@id="' + el.id + '"]';
    var dt = el.getAttribute('data-test');
    if (dt) return '//*[@data-test="' + dt + '"]';
    var nm = el.getAttribute('name');
    if (nm) return '//*[@name="' + nm + '"]';
    var ph = el.getAttribute('placeholder');
    if (ph) return '//*[@placeholder="' + ph + '"]';
    var txt = el.innerText ? el.innerText.trim() : '';
    if (txt && txt.length < 50)
        return '//' + el.tagName.toLowerCase() + '[normalize-space()="' + txt + '"]';
    var path = '';
    var node = el;
    while (node && node.nodeType === 1) {
        var idx = 1, sib = node.previousSibling;
        while (sib) {
            if (sib.nodeType === 1 && sib.tagName === node.tagName) idx++;
            sib = sib.previousSibling;
        }
        path = '/' + node.tagName.toLowerCase() + '[' + idx + ']' + path;
        node = node.parentNode;
    }
    return path;
}

function showBadge() {
    var b = document.getElementById('__rec_badge');
    if (b) b.remove();
    var badge = document.createElement('div');
    badge.id = '__rec_badge';
    badge.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);' +
        'background:#1F4E79;color:white;padding:8px 20px;border-radius:20px;' +
        'font-family:Arial;font-size:13px;font-weight:bold;z-index:9999999;' +
        'pointer-events:none;box-shadow:0 2px 10px rgba(0,0,0,0.4);';
    badge.innerText = '🎯 Haz click en el elemento — ESC para cancelar';
    document.body.appendChild(badge);
}

function cleanup() {
    if (window.__lastHov) {
        window.__lastHov.style.outline = window.__lastOut || '';
        window.__lastHov.style.backgroundColor = window.__lastBg || '';
    }
    var b = document.getElementById('__rec_badge');
    if (b) b.remove();
    document.removeEventListener('mouseover', window.__hovH, true);
    document.removeEventListener('click', window.__clickH, true);
    document.removeEventListener('keydown', window.__escH, true);
    document.body.style.cursor = 'default';
}

showBadge();

window.__hovH = function(e) {
    if (window.__lastHov && window.__lastHov !== e.target) {
        window.__lastHov.style.outline = window.__lastOut || '';
        window.__lastHov.style.backgroundColor = window.__lastBg || '';
    }
    window.__lastOut = e.target.style.outline;
    window.__lastBg  = e.target.style.backgroundColor;
    window.__lastHov = e.target;
    e.target.style.outline = '2px dashed #FF6600';
    e.target.style.backgroundColor = 'rgba(255,102,0,0.08)';
};

window.__clickH = function(e) {
    e.preventDefault();
    e.stopPropagation();
    window.__recordedXPath = getSmartXPath(e.target);
    window.__recordedTag   = e.target.tagName.toLowerCase();
    e.target.style.outline = '3px solid #00CC00';
    e.target.style.backgroundColor = 'rgba(0,204,0,0.15)';
    cleanup();
};

window.__escH = function(e) {
    if (e.key === 'Escape') {
        window.__recordedXPath = '__CANCELLED__';
        cleanup();
    }
};

document.body.style.cursor = 'crosshair';
document.addEventListener('mouseover', window.__hovH, true);
document.addEventListener('click', window.__clickH, true);
document.addEventListener('keydown', window.__escH, true);
`;

export class XPathInspector {
    private lastTag: string = 'div';

    constructor(private dm: DriverManager) {}

    async activate(): Promise<void> {
        await this.dm.executeScript(
            'window.__recordedXPath = null; window.__recordedTag = null;'
        );
        await this.bringChromeToFront();
        await this.dm.executeScript(INSPECTOR_JS);
        console.log('[XPathInspector] Inspector activado');
    }

    async waitForSelection(timeoutSec: number): Promise<string | null> {
        const limit = Date.now() + timeoutSec * 1000;
        while (Date.now() < limit) {
            const xpath = await this.dm.executeScript(
                'return window.__recordedXPath || null;'
            ) as string | null;

            if (xpath && xpath.length > 0) {
                if (xpath === '__CANCELLED__') {
                    console.log('[XPathInspector] Cancelado');
                    return null;
                }
                this.lastTag = await this.dm.executeScript(
                    'return window.__recordedTag || "div";'
                ) as string;
                console.log('[XPathInspector] Capturado:', xpath);
                return xpath;
            }
            await new Promise(r => setTimeout(r, 200));
        }
        return null;
    }

    getLastTag(): string {
        return this.lastTag;
    }

    suggestVariableName(xpath: string, tag: string): string {
        const patterns = [
            { re: /@id="([^"]+)"/, prefix: tag },
            { re: /@data-test="([^"]+)"/, prefix: tag },
            { re: /@name="([^"]+)"/, prefix: tag },
            { re: /@placeholder="([^"]+)"/, prefix: tag },
        ];
        for (const { re, prefix } of patterns) {
            const m = xpath.match(re);
            if (m) return `${prefix}_${m[1].replace(/[^a-zA-Z0-9]/g, '_')}`;
        }
        return `${tag}_elemento_${Date.now() % 1000}`;
    }

    async bringChromeToFront(): Promise<void> {
        try {
            await this.dm.executeScript('window.focus();');
            if (os.platform() === 'darwin') {
                exec('osascript -e \'tell application "Google Chrome" to activate\'');
            }
            await new Promise(r => setTimeout(r, 400));
        } catch (e) {
            console.log('[XPathInspector] bringChromeToFront:', e);
        }
    }

    async bringPanelToFront(win: BrowserWindow | null): Promise<void> {
        try {
            await new Promise(r => setTimeout(r, 300));
            if (os.platform() === 'darwin') {
                exec('osascript -e \'tell application "System Events" to set frontmost of (first process whose name contains "Electron") to true\'');
                await new Promise(r => setTimeout(r, 300));
            }
            win?.focus();
        } catch (e) {
            console.log('[XPathInspector] bringPanelToFront:', e);
        }
    }
}
