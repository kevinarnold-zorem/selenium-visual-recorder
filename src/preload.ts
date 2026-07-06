import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    navigate:          (url: string)   => ipcRenderer.invoke('navigate', url),
    activateInspector: ()              => ipcRenderer.invoke('activate-inspector'),
    verifySelector:    (sel: string)   => ipcRenderer.invoke('verify-selector', sel),
    executeStep:       (step: any)     => ipcRenderer.invoke('execute-step', step),
    deleteStep:        (idx: number)   => ipcRenderer.invoke('delete-step', idx),
    clearSteps:        ()              => ipcRenderer.invoke('clear-steps'),
    previewGherkin:    (f: string, s: string) => ipcRenderer.invoke('preview-gherkin', f, s),
    generateFiles:     (f: string, s: string, linkedMap?: any, scenarioLines?: any) => ipcRenderer.invoke('generate-files', f, s, linkedMap, scenarioLines),
    getCurrentUrl:     ()              => ipcRenderer.invoke('get-current-url'),
    getLocators:       ()              => ipcRenderer.invoke('get-locators'),
    getSteps:          ()              => ipcRenderer.invoke('get-steps'),
    getLinkedStepsKeys: ()             => ipcRenderer.invoke('get-linked-steps-keys'),
    getLocatorIndex:    ()             => ipcRenderer.invoke('get-locator-index'),
});
