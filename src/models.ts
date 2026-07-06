export type Action =
    | 'NAVEGAR'
    | 'CLICK'
    | 'ESCRIBIR'
    | 'LIMPIAR'
    | 'SELECCIONAR'
    | 'VERIFICAR_TEXTO'
    | 'VERIFICAR_EXISTE'
    | 'VERIFICAR_NO_EXISTE'
    | 'ESPERAR'
    | 'SCREENSHOT';

export interface RecordedStep {
    action: Action;
    variableName?: string;
    selector?: string;
    value?: string;
    description?: string;
    page?: string;
}

export interface VerificationResult {
    success: boolean;
    tag?: string;
    text?: string;
    type?: string;
    error?: string;
    summary: string;
}

export interface ExecutionResult {
    success: boolean;
    message: string;
}

export function toGherkinLine(step: RecordedStep, index: number): string {
    const keyword = index === 0 ? 'Given' : (index === 1 ? 'When' : 'And');
    const locator = step.variableName ? `{${step.variableName}}` : (step.selector || '');

    switch (step.action) {
        case 'NAVEGAR':
            return `${keyword} el usuario navega a "${step.value}"`;
        case 'CLICK':
            return `${keyword} el usuario hace click en "${locator}"`;
        case 'ESCRIBIR':
            return `${keyword} el usuario escribe "${step.value}" en "${locator}"`;
        case 'LIMPIAR':
            return `${keyword} el usuario limpia el campo "${locator}"`;
        case 'SELECCIONAR':
            return `${keyword} el usuario selecciona "${step.value}" en "${locator}"`;
        case 'VERIFICAR_TEXTO':
            return `Then el usuario verifica el texto "${step.value}" en "${locator}"`;
        case 'VERIFICAR_EXISTE':
            return `Then el elemento "${locator}" es visible`;
        case 'VERIFICAR_NO_EXISTE':
            return `Then el elemento "${locator}" no es visible`;
        case 'ESPERAR':
            return `${keyword} el usuario espera "${step.value}" segundos`;
        case 'SCREENSHOT':
            return `${keyword} el usuario toma una captura "${step.value || 'screenshot'}"`;
        default:
            return `${keyword} ${step.description || ''}`;
    }
}

export function stepSummary(step: RecordedStep): string {
    const locator = step.variableName ? `{${step.variableName}}` : (step.selector || '');
    switch (step.action) {
        case 'NAVEGAR':         return `🌐 NAVEGAR → ${step.value}`;
        case 'CLICK':           return `👆 CLICK → ${locator}`;
        case 'ESCRIBIR':        return `✏️ ESCRIBIR "${step.value}" → ${locator}`;
        case 'LIMPIAR':         return `🧹 LIMPIAR → ${locator}`;
        case 'SELECCIONAR':     return `📋 SELECCIONAR "${step.value}" → ${locator}`;
        case 'VERIFICAR_TEXTO': return `✅ VERIFICAR TEXTO "${step.value}" → ${locator}`;
        case 'VERIFICAR_EXISTE':return `👁️ VERIFICAR EXISTE → ${locator}`;
        case 'VERIFICAR_NO_EXISTE': return `🚫 VERIFICAR NO EXISTE → ${locator}`;
        case 'ESPERAR':         return `⏳ ESPERAR ${step.value}s`;
        case 'SCREENSHOT':      return `📸 SCREENSHOT`;
        default:                return step.description || step.action;
    }
}
