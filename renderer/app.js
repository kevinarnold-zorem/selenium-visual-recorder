// api viene del preload via contextBridge - no redeclarar
const { navigate, activateInspector, verifySelector, executeStep,
        deleteStep, clearSteps, previewGherkin,
        generateFiles, getCurrentUrl, getLocators, getSteps,
        getLinkedStepsKeys, getLocatorIndex } = window.api;

// ─── ESTADO ──────────────────────────────────────────────────────────────────
let selectedStepIndex   = -1;
let cachedSteps         = []; // copia local de los steps grabados
let pendingLinkedMap    = {}; // mapa { stepText: RecordedStep[] } confirmado en Enlazar
let pendingScenarioLines = null; // [{ keyword, text }] del escenario construido en Enlazar

// ─── ELEMENTOS UI ────────────────────────────────────────────────────────────
const txtUrl       = document.getElementById('txtUrl');
const btnGo        = document.getElementById('btnGo');
const txtSelector  = document.getElementById('txtSelector');
const txtVarName   = document.getElementById('txtVarName');
const txtPage      = document.getElementById('txtPage');
const btnInspect   = document.getElementById('btnInspect');
const btnCopy      = document.getElementById('btnCopy');
const btnVerify    = document.getElementById('btnVerify');
const lblVerify    = document.getElementById('lblVerifyResult');
const cmbAction    = document.getElementById('cmbAction');
const txtValue     = document.getElementById('txtValue');
const txtDesc      = document.getElementById('txtDesc');
const btnExecute   = document.getElementById('btnExecute');
const lstSteps     = document.getElementById('lstSteps');
const txtGherkin   = document.getElementById('txtGherkin');
const txtFeature   = document.getElementById('txtFeature');
const txtScenario  = document.getElementById('txtScenario');
const btnPreview   = document.getElementById('btnPreview');
const btnGenerate  = document.getElementById('btnGenerate');
const btnEnlazar   = document.getElementById('btnEnlazar');
const btnDelete    = document.getElementById('btnDeleteStep');
const btnClear     = document.getElementById('btnClearSteps');
const lblStatus    = document.getElementById('lblStatus');
const lblGenerate  = document.getElementById('lblGenerateResult');

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function setStatus(msg, color = '#888AAA') {
    lblStatus.textContent = msg;
    lblStatus.style.color = color;
}

function setVerify(msg, type = '') {
    lblVerify.textContent = msg;
    lblVerify.className = 'verify-result' + (type ? ` ${type}` : '');
}

function setGenerate(msg, type = '') {
    lblGenerate.textContent = msg;
    lblGenerate.className = 'generate-result' + (type ? ` ${type}` : '');
}

function disableBtn(btn, text) {
    btn.disabled = true;
    btn.dataset.original = btn.textContent;
    btn.textContent = text;
    btn.style.opacity = '0.6';
}

function enableBtn(btn) {
    btn.disabled = false;
    btn.textContent = btn.dataset.original || btn.textContent;
    btn.style.opacity = '1';
}

function renderSteps(steps) {
    cachedSteps = steps || [];
    lstSteps.innerHTML = '';
    if (!steps || steps.length === 0) {
        lstSteps.innerHTML = '<li class="step-empty">Sin steps grabados aun...</li>';
        return;
    }
    steps.forEach((s, i) => {
        const li = document.createElement('li');
        li.textContent = `${i + 1}. ${stepSummary(s)}`;
        li.dataset.index = i;
        if (i === selectedStepIndex) li.classList.add('selected');
        li.addEventListener('click', () => {
            selectedStepIndex = i;
            document.querySelectorAll('#lstSteps li').forEach(el => el.classList.remove('selected'));
            li.classList.add('selected');
        });
        lstSteps.appendChild(li);
    });
}

function stepSummary(step) {
    const loc = step.variableName ? `{${step.variableName}}` : (step.selector || '');
    switch (step.action) {
        case 'NAVEGAR':             return `🌐 NAVEGAR → ${step.value}`;
        case 'CLICK':               return `👆 CLICK → ${loc}`;
        case 'ESCRIBIR':            return `✏️ ESCRIBIR "${step.value}" → ${loc}`;
        case 'LIMPIAR':             return `🧹 LIMPIAR → ${loc}`;
        case 'SELECCIONAR':         return `📋 SELECCIONAR "${step.value}" → ${loc}`;
        case 'VERIFICAR_TEXTO':     return `✅ VERIFICAR TEXTO "${step.value}" → ${loc}`;
        case 'VERIFICAR_EXISTE':    return `👁️ VERIFICAR EXISTE → ${loc}`;
        case 'VERIFICAR_NO_EXISTE': return `🚫 VERIFICAR NO EXISTE → ${loc}`;
        case 'ESPERAR':             return `⏳ ESPERAR ${step.value}s`;
        case 'SCREENSHOT':          return `📸 SCREENSHOT`;
        default:                    return step.description || step.action;
    }
}

function clearStepFields() {
    txtSelector.value = '';
    txtVarName.value  = '';
    txtPage.value     = '';
    txtValue.value    = '';
    txtDesc.value     = '';
    setVerify('— Ingresa un selector y presiona Verificar');
}

// ─── EVENTOS ─────────────────────────────────────────────────────────────────

btnGo.addEventListener('click', async () => {
    const url = txtUrl.value.trim();
    if (!url) return;
    setStatus('Navegando a: ' + url, '#2E75B6');
    await navigate(url);
    setStatus('✓ En: ' + url, '#00CC00');
});

txtUrl.addEventListener('keydown', e => {
    if (e.key === 'Enter') btnGo.click();
});

btnInspect.addEventListener('click', async () => {
    disableBtn(btnInspect, '⏳ Esperando seleccion en Chrome...');
    setStatus('🖱️ Haz click en un elemento en Chrome... (ESC para cancelar)', '#FF6600');
    setVerify('Esperando seleccion en Chrome...');

    const result = await activateInspector();
    enableBtn(btnInspect);

    if (result.success) {
        txtSelector.value = result.xpath;
        txtVarName.value  = result.suggested;
        setVerify(`XPath capturado: ${result.xpath}`, '');
        setStatus('✓ Elemento capturado — verifica el selector', '#00CC00');
    } else {
        setVerify('Cancelado o timeout', 'err');
        setStatus('⚠ Inspector cancelado', '#FF6600');
    }
});

btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(txtSelector.value);
    setStatus('📋 Copiado al portapapeles', '#2E75B6');
});

btnVerify.addEventListener('click', async () => {
    const selector = txtSelector.value.trim();
    if (!selector) {
        setVerify('⚠ Ingresa un selector primero', 'err');
        return;
    }
    disableBtn(btnVerify, '⏳ Verificando...');
    const result = await verifySelector(selector);
    enableBtn(btnVerify);

    if (result.success) {
        setVerify(result.summary, 'ok');
        setStatus('✓ Selector verificado', '#00CC00');
    } else {
        setVerify(result.summary, 'err');
        setStatus('✗ Selector no encontrado', '#CC0000');
    }
});

cmbAction.addEventListener('change', () => {
    const action = cmbAction.value;
    const needsSelector = !['NAVEGAR', 'ESPERAR', 'SCREENSHOT'].includes(action);
    txtSelector.disabled = !needsSelector;
    txtVarName.disabled  = !needsSelector;

    const placeholders = {
        NAVEGAR:         'https://...',
        ESCRIBIR:        'texto a ingresar...',
        SELECCIONAR:     'opcion a seleccionar...',
        VERIFICAR_TEXTO: 'texto esperado...',
        ESPERAR:         'segundos ej: 2',
        SCREENSHOT:      'nombre de la captura',
    };
    txtValue.placeholder = placeholders[action] || '';
});

btnExecute.addEventListener('click', async () => {
    const action   = cmbAction.value;
    const selector = txtSelector.value.trim();
    const varName  = txtVarName.value.trim();
    const value    = txtValue.value.trim();
    const desc     = txtDesc.value.trim();

    if (action === 'NAVEGAR' && !value) {
        setStatus('⚠ Ingresa la URL para NAVEGAR', '#FF6600'); return;
    }
    if (!['NAVEGAR', 'ESPERAR', 'SCREENSHOT'].includes(action) && !selector) {
        setStatus('⚠ Ingresa o selecciona un selector', '#FF6600'); return;
    }

    const page = txtPage.value.trim();
    const step = { action, variableName: varName, selector, value, description: desc, page: page || undefined };
    disableBtn(btnExecute, '⏳ Ejecutando...');
    setStatus('⚡ Ejecutando step...', '#FF6600');

    const result = await executeStep(step);
    enableBtn(btnExecute);

    if (result.success) {
        setStatus(`✓ Step guardado (${result.totalSteps} en total)`, '#00CC00');
        clearStepFields();
        const stepsRes = await getSteps();
        renderSteps(stepsRes.steps);
        await updatePreview();
        // El índice de locators se refresca solo al Generar Archivos (TS files)
    } else {
        setStatus('✗ Fallo: ' + result.message, '#CC0000');
    }
});

btnDelete.addEventListener('click', async () => {
    if (selectedStepIndex < 0) {
        setStatus('⚠ Selecciona un step de la lista', '#FF6600'); return;
    }
    await deleteStep(selectedStepIndex);
    selectedStepIndex = -1;
    const stepsRes = await getSteps();
    renderSteps(stepsRes.steps);
    await updatePreview();
    setStatus('🗑️ Step eliminado', '#FF6600');
});

btnClear.addEventListener('click', async () => {
    await clearSteps();
    selectedStepIndex = -1;
    renderSteps([]);
    txtGherkin.value = '';
    setStatus('🧹 Steps limpiados', '#666888');
});

btnPreview.addEventListener('click', updatePreview);

async function updatePreview() {
    const result = await previewGherkin(
        txtFeature.value.trim() || 'Flujo grabado',
        txtScenario.value.trim() || 'Escenario grabado'
    );
    if (result.success) txtGherkin.value = result.preview;
}

btnGenerate.addEventListener('click', async () => {
    disableBtn(btnGenerate, '⏳ Generando...');
    const result = await generateFiles(
        txtFeature.value.trim() || 'Flujo grabado',
        txtScenario.value.trim() || 'Escenario grabado',
        Object.keys(pendingLinkedMap).length > 0 ? pendingLinkedMap : undefined,
        pendingScenarioLines || undefined
    );
    enableBtn(btnGenerate);

    if (result.success) {
        const linkedInfo = result.linkedStepsPath
            ? ` | Linked: ${result.linkedStepsPath}`
            : '';
        setGenerate(`✓ Feature: ${result.featurePath}${linkedInfo}`, 'ok');
        setStatus('✓ Archivos generados correctamente', '#00CC00');
        pendingLinkedMap     = {};
        pendingScenarioLines = null;
        await reloadLocatorIndex(); // refrescar índice con los nuevos TS locator files
    } else {
        setGenerate('✗ ' + result.error, 'err');
        setStatus('✗ Error generando archivos', '#CC0000');
    }
});

// ─── Autocomplete: Nombre variable (Inspector) ────────────────────────────────

function locatorContext(entry) {
    // "login/productsLocators.ts" → "login › products"
    const parts = entry.file.replace('.ts', '').split('/');
    if (parts.length === 1) return parts[0]; // "Locators"
    const folder = parts.slice(0, -1).join(' › ');
    const name   = parts[parts.length - 1].replace('Locators', '').replace(/([A-Z])/g, ' $1').trim().toLowerCase();
    return name ? `${folder} › ${name}` : folder;
}

function showLocatorDropdown(dropdown, value) {
    const q = value.trim().toLowerCase();
    if (!q || !cachedLocatorIndex.length) { dropdown.style.display = 'none'; return; }

    const matches = cachedLocatorIndex.filter(e =>
        e.key.toLowerCase().includes(q) ||
        e.constName.toLowerCase().includes(q) ||
        e.file.toLowerCase().includes(q)
    );
    if (!matches.length) { dropdown.style.display = 'none'; return; }

    dropdown.innerHTML = '';
    matches.slice(0, 10).forEach(entry => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item locator-item';
        item.title     = entry.selector;

        // Highlight en la key
        const kq  = entry.key.toLowerCase();
        const idx = kq.indexOf(q);
        const keyHtml = idx >= 0
            ? entry.key.slice(0, idx) + `<strong>${entry.key.slice(idx, idx + q.length)}</strong>` + entry.key.slice(idx + q.length)
            : entry.key;

        const ctx = locatorContext(entry);
        item.innerHTML = `<span class="li-key">${keyHtml}</span><span class="li-ctx">${ctx}</span>`;

        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            txtVarName.value  = entry.varName;   // snake_case para usar en steps
            txtSelector.value = entry.selector;
            dropdown.style.display = 'none';
            setVerify(`${entry.key} · ${ctx} → ${entry.selector}`, 'ok');
        });
        dropdown.appendChild(item);
    });
    dropdown.style.display = 'block';
}

function setupVarNameAutocomplete() {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;';
    txtVarName.parentNode.insertBefore(wrapper, txtVarName);
    wrapper.appendChild(txtVarName);

    const dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown';
    dropdown.style.display = 'none';
    wrapper.appendChild(dropdown);

    txtVarName.addEventListener('input',  (e) => showLocatorDropdown(dropdown, e.target.value));
    txtVarName.addEventListener('focus',  ()  => { if (txtVarName.value.trim()) showLocatorDropdown(dropdown, txtVarName.value); });
    txtVarName.addEventListener('blur',   ()  => setTimeout(() => { dropdown.style.display = 'none'; }, 180));
}

async function reloadLocatorIndex() {
    try {
        const { entries } = await getLocatorIndex();
        cachedLocatorIndex = entries || [];
    } catch { cachedLocatorIndex = []; }
}

// ─── ENLAZAR ─────────────────────────────────────────────────────────────────

const mainPanel      = document.querySelector('main.main');
const enlazarPanel   = document.getElementById('enlazarPanel');
const lstEnlazarDisp = document.getElementById('lstEnlazarDisponibles');
const scenarioBuilder= document.getElementById('scenarioBuilder');

let enlazarScenarioSteps = []; // [{ id, keyword, text, assignedIndices: [], existsInLinked: false }]
let activeScenarioStepId  = null;
let stepIdCounter = 0;
let linkedStepsKeys    = []; // Keys loaded from linked-steps.ts for autocomplete (Enlazar panel)
let cachedLocatorIndex = []; // [{ key, varName, selector, constName, file }] desde TS files

const KEYWORDS = ['Given', 'When', 'And', 'Then', 'But'];

function defaultKeyword(index) {
    if (index === 0) return 'Given';
    if (index === 1) return 'When';
    return 'And';
}

function stepToText(step) {
    if (step.description) return step.description;
    const loc = step.variableName
        ? step.variableName.replace(/_/g, ' ')
        : (step.selector || '');
    switch (step.action) {
        case 'NAVEGAR':           return `el usuario navega a "${step.value}"`;
        case 'CLICK':             return `el usuario hace click en "${loc}"`;
        case 'ESCRIBIR':          return `el usuario escribe "${step.value}" en "${loc}"`;
        case 'LIMPIAR':           return `el usuario limpia el campo "${loc}"`;
        case 'SELECCIONAR':       return `el usuario selecciona "${step.value}" en "${loc}"`;
        case 'VERIFICAR_TEXTO':   return `el texto de "${loc}" es "${step.value}"`;
        case 'VERIFICAR_EXISTE':  return `"${loc}" es visible`;
        case 'VERIFICAR_NO_EXISTE': return `"${loc}" no está presente`;
        case 'ESPERAR':           return `espera ${step.value} segundos`;
        default:                  return step.description || step.action;
    }
}

// ─── Abrir / Cerrar ───────────────────────────────────────────────────────────

async function openEnlazar() {
    // Conservar el escenario construido si ya existe — el usuario puede modificarlo
    // Para empezar desde cero usar el botón "🗑 Nuevo"
    if (enlazarScenarioSteps.length === 0) {
        activeScenarioStepId = null;
        stepIdCounter = 0;
    }

    // Cargar keys de linked-steps para autocomplete
    try {
        const { keys } = await getLinkedStepsKeys();
        linkedStepsKeys = keys || [];
    } catch { linkedStepsKeys = []; }

    renderEnlazarDisponibles();
    renderScenarioBuilder();

    mainPanel.style.display    = 'none';
    enlazarPanel.style.display = 'flex';
    setStatus('🔗 Modo Enlazar — asigna steps a cada fila del escenario', '#FF6600');
}

function resetEnlazar() {
    enlazarScenarioSteps = [];
    activeScenarioStepId  = null;
    stepIdCounter = 0;
    renderEnlazarDisponibles();
    renderScenarioBuilder();
    setStatus('🔗 Escenario limpiado — construye uno nuevo', '#FF6600');
}

function closeEnlazar(confirm) {
    enlazarPanel.style.display = 'none';
    mainPanel.style.display    = 'flex';

    if (confirm && enlazarScenarioSteps.length > 0) {
        pendingLinkedMap     = buildLinkedStepsMap();
        pendingScenarioLines = enlazarScenarioSteps
            .filter(s => s.text.trim())
            .map(s => ({ keyword: s.keyword, text: s.text.trim() }));
        txtGherkin.value = buildGherkinFromEnlazar();
        const count = Object.keys(pendingLinkedMap).length;
        setStatus(`✓ Escenario enlazado — ${count} step(s) mapeados, listo para Generar Archivos`, '#00CC00');
    } else {
        setStatus('✓ Panel listo', '#00CC00');
    }
}

function buildLinkedStepsMap() {
    const map = {};
    enlazarScenarioSteps.forEach(sStep => {
        // Skip steps that already exist in linked-steps — no regenerar
        if (sStep.existsInLinked) return;
        if (sStep.text.trim() && sStep.assignedIndices.length > 0) {
            map[sStep.text.trim()] = sStep.assignedIndices.map(i => cachedSteps[i]);
        }
    });
    return map;
}

// ─── Render: steps disponibles ────────────────────────────────────────────────

function getAssignedSet() {
    const set = new Set();
    enlazarScenarioSteps.forEach(s => s.assignedIndices.forEach(i => set.add(i)));
    return set;
}

function renderEnlazarDisponibles() {
    lstEnlazarDisp.innerHTML = '';
    if (!cachedSteps || cachedSteps.length === 0) {
        lstEnlazarDisp.innerHTML = '<li class="step-empty">Sin steps grabados</li>';
        return;
    }
    const assigned = getAssignedSet();
    cachedSteps.forEach((s, i) => {
        const li = document.createElement('li');
        li.textContent = `${i + 1}. ${stepSummary(s)}`;
        li.dataset.index = i;
        if (assigned.has(i)) li.classList.add('assigned');
        li.addEventListener('click', () => onAssignStep(i));
        lstEnlazarDisp.appendChild(li);
    });
}

// ─── Autocomplete helper ──────────────────────────────────────────────────────

function showDropdown(dropdown, value, input, sStep) {
    const q = value.trim().toLowerCase();
    if (!q || linkedStepsKeys.length === 0) { dropdown.style.display = 'none'; return; }
    const matches = linkedStepsKeys.filter(k => k.toLowerCase().includes(q));
    if (!matches.length) { dropdown.style.display = 'none'; return; }
    dropdown.innerHTML = '';
    matches.slice(0, 8).forEach(match => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        // Highlight matching portion
        const idx = match.toLowerCase().indexOf(q);
        item.innerHTML = idx >= 0
            ? match.slice(0, idx) + `<strong>${match.slice(idx, idx + q.length)}</strong>` + match.slice(idx + q.length)
            : match;
        item.addEventListener('mousedown', (e) => {
            e.preventDefault(); // evita blur antes del click
            input.value = match;
            sStep.text = match;
            sStep.existsInLinked = true;
            input.classList.add('scenario-text--existing');
            input.title = '♻️ Step reutilizado — ya definido en linked-steps';
            dropdown.style.display = 'none';
        });
        dropdown.appendChild(item);
    });
    dropdown.style.display = 'block';
}

// ─── Render: constructor de escenario ─────────────────────────────────────────

function renderScenarioBuilder() {
    scenarioBuilder.innerHTML = '';
    if (enlazarScenarioSteps.length === 0) {
        scenarioBuilder.innerHTML = '<div class="scenario-empty">Agrega un step con el botón "+ Nuevo Step"<br>o haz click en un step grabado de la izquierda</div>';
        return;
    }
    enlazarScenarioSteps.forEach(sStep => {
        const div = document.createElement('div');
        div.className = 'scenario-step' + (sStep.id === activeScenarioStepId ? ' active' : '');
        div.dataset.id = sStep.id;

        // Header: keyword + texto + borrar
        const header = document.createElement('div');
        header.className = 'scenario-step-header';

        const kwSelect = document.createElement('select');
        kwSelect.className = 'keyword-select';
        KEYWORDS.forEach(kw => {
            const opt = document.createElement('option');
            opt.value = kw; opt.textContent = kw;
            if (kw === sStep.keyword) opt.selected = true;
            kwSelect.appendChild(opt);
        });
        kwSelect.addEventListener('change', (e) => {
            sStep.keyword = e.target.value;
        });
        kwSelect.addEventListener('click', e => e.stopPropagation());

        const txtInput = document.createElement('input');
        txtInput.type = 'text';
        txtInput.className = 'scenario-text' + (sStep.existsInLinked ? ' scenario-text--existing' : '');
        txtInput.value = sStep.text;
        txtInput.placeholder = 'Descripción del step...';
        if (sStep.existsInLinked) txtInput.title = '♻️ Step reutilizado — ya definido en linked-steps';

        // Dropdown de autocomplete
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        dropdown.style.display = 'none';

        txtInput.addEventListener('input', (e) => {
            sStep.text = e.target.value;
            if (sStep.existsInLinked) {
                sStep.existsInLinked = false;
                txtInput.classList.remove('scenario-text--existing');
                txtInput.title = '';
            }
            showDropdown(dropdown, e.target.value, txtInput, sStep);
        });
        txtInput.addEventListener('click', e => e.stopPropagation());
        txtInput.addEventListener('focus', () => {
            if (txtInput.value.trim()) showDropdown(dropdown, txtInput.value, txtInput, sStep);
        });
        txtInput.addEventListener('blur', () => {
            setTimeout(() => { dropdown.style.display = 'none'; }, 180);
        });

        // Wrapper relativo para posicionar el dropdown
        const textWrapper = document.createElement('div');
        textWrapper.className = 'scenario-text-wrapper';
        textWrapper.append(txtInput, dropdown);

        const btnRemove = document.createElement('button');
        btnRemove.className = 'btn-remove-step';
        btnRemove.textContent = '✕';
        btnRemove.title = 'Eliminar este step';
        btnRemove.addEventListener('click', (e) => {
            e.stopPropagation();
            enlazarScenarioSteps = enlazarScenarioSteps.filter(s => s.id !== sStep.id);
            if (activeScenarioStepId === sStep.id) {
                activeScenarioStepId = enlazarScenarioSteps.length > 0
                    ? enlazarScenarioSteps[enlazarScenarioSteps.length - 1].id
                    : null;
            }
            renderScenarioBuilder();
            renderEnlazarDisponibles();
        });

        header.append(kwSelect, textWrapper, btnRemove);

        // Badges de steps asignados
        const badges = document.createElement('div');
        badges.className = 'scenario-step-badges';

        if (sStep.existsInLinked) {
            // Badge especial: step reutilizado de linked-steps.ts
            const reuseBadge = document.createElement('span');
            reuseBadge.className = 'step-badge step-badge--reused';
            reuseBadge.innerHTML = '♻️ <em>step reutilizado de linked-steps.ts</em>';
            reuseBadge.title = 'Este step ya tiene implementación en linked-steps.ts — no necesita acciones asignadas';
            badges.appendChild(reuseBadge);
        } else {
            sStep.assignedIndices.forEach(idx => {
                const badge = document.createElement('span');
                badge.className = 'step-badge';
                badge.title = stepSummary(cachedSteps[idx]);
                badge.textContent = `${idx + 1}. ${stepSummary(cachedSteps[idx])}`;

                const removeX = document.createElement('span');
                removeX.className = 'step-badge-remove';
                removeX.textContent = '×';
                removeX.addEventListener('click', (e) => {
                    e.stopPropagation();
                    sStep.assignedIndices = sStep.assignedIndices.filter(i => i !== idx);
                    renderScenarioBuilder();
                    renderEnlazarDisponibles();
                });
                badge.appendChild(removeX);
                badges.appendChild(badge);
            });
        }

        div.append(header, badges);

        // Click en la fila → activar
        div.addEventListener('click', () => {
            activeScenarioStepId = sStep.id;
            renderScenarioBuilder();
        });

        scenarioBuilder.appendChild(div);
    });
}

// ─── Asignar step grabado a la fila activa ────────────────────────────────────

function onAssignStep(stepIndex) {
    // Si no hay fila activa, crea una nueva
    if (activeScenarioStepId === null || !enlazarScenarioSteps.find(s => s.id === activeScenarioStepId)) {
        addScenarioStep();
    }
    const target = enlazarScenarioSteps.find(s => s.id === activeScenarioStepId);
    if (!target) return;

    // No asignar el mismo step dos veces en la misma fila
    if (target.assignedIndices.includes(stepIndex)) return;

    target.assignedIndices.push(stepIndex);

    // Auto-fill texto si está vacío
    if (!target.text.trim()) {
        target.text = stepToText(cachedSteps[stepIndex]);
    }

    renderScenarioBuilder();
    renderEnlazarDisponibles();
}

// ─── Agregar nueva fila al escenario ─────────────────────────────────────────

function addScenarioStep() {
    const id = ++stepIdCounter;
    const keyword = defaultKeyword(enlazarScenarioSteps.length);
    enlazarScenarioSteps.push({ id, keyword, text: '', assignedIndices: [], existsInLinked: false });
    activeScenarioStepId = id;
    renderScenarioBuilder();
    // Scroll al nuevo step
    setTimeout(() => {
        scenarioBuilder.scrollTop = scenarioBuilder.scrollHeight;
    }, 50);
}

// ─── Construir Gherkin desde el escenario enlazado ───────────────────────────

function buildGherkinFromEnlazar() {
    const feature  = txtFeature.value.trim()  || 'Flujo grabado';
    const scenario = txtScenario.value.trim() || 'Escenario grabado';
    const date = new Date().toLocaleString('es-PE');
    const stepLines = enlazarScenarioSteps
        .filter(s => s.text.trim())
        .map(s => `    ${s.keyword} ${s.text.trim()}`);
    return [
        `# Generado por Electron Visual Recorder`,
        `# Fecha: ${date}`,
        '',
        `Feature: ${feature}`,
        '',
        `  Scenario: ${scenario}`,
        ...stepLines,
        ''
    ].join('\n');
}

// ─── Eventos del panel Enlazar ────────────────────────────────────────────────

btnEnlazar.addEventListener('click', openEnlazar);

document.getElementById('btnEnlazarCancelar').addEventListener('click',  () => closeEnlazar(false));
document.getElementById('btnEnlazarConfirmar').addEventListener('click', () => closeEnlazar(true));
document.getElementById('btnNuevoEscenario').addEventListener('click', resetEnlazar);

document.getElementById('btnAddScenarioStep').addEventListener('click', () => {
    addScenarioStep();
});

// ─── DOMContentLoaded ─────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', async () => {
    setStatus('✓ Panel listo', '#00CC00');
    const urlRes = await getCurrentUrl();
    if (urlRes.url && urlRes.url !== 'chrome activo') {
        txtUrl.value = urlRes.url;
    }
    // Inicializar estado de campos según la acción por defecto
    cmbAction.value = 'CLICK';
    cmbAction.dispatchEvent(new Event('change'));
    setupVarNameAutocomplete();
    await reloadLocatorIndex();
});
