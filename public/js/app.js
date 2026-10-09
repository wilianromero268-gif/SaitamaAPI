let S = '';

const $ = id => document.getElementById(id);

async function call(path, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    'x-dashboard-secret': S
  };

  const response = await fetch('https://saitamaapi.wilianromero268.workers.dev' + path, options);
  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    console.error('Respuesta no JSON:', text);
    throw new Error(
      `El servidor devolvió HTML/texto en ${path} en lugar de JSON.`
    );
  }

  if (!response.ok) {
    throw new Error(data.error || `Error HTTP ${response.status}`);
  }

  return data;
}

async function load() {
  S = $('secret').value.trim();

  if (!S) {
    alert('Escribe tu DASHBOARD_SECRET');
    return;
  }

  try {
    const d = await call('/dashboard/api/stats');

    $('panel').innerHTML = `
      <div class="stat">
        <b>Uso diario</b>
        <h2>${d.requests}/${d.limit}</h2>
        <div class="bar">
          <div class="fill" style="width:${Math.min(100, (d.requests / d.limit) * 100)}%"></div>
        </div>
        <small>Restantes: ${d.remaining}</small>
      </div>

      <div class="stat">
        <b>Errores</b>
        <h2>${d.errors}</h2>
      </div>

      <div class="stat">
        <b>API Key</b>
        <h2>${d.keyActive ? 'ACTIVA' : 'NINGUNA'}</h2>
        <small>${d.keyPrefix || 'Sin clave activa'}</small>
      </div>

      <div class="stat">
        <b>Creador</b>
        <h2>${d.creator}</h2>
        <small>${d.year}</small>
      </div>
    `;

    const docsResponse = await fetch('/api/docs');
    const docsText = await docsResponse.text();
    const docs = JSON.parse(docsText);

    if (docs.endpoints?.length) {
      $('eps').innerHTML = docs.endpoints.map(e => `
        <div class="card">
          <b>${e.method} ${e.path}</b>
          <p>${e.description || 'Sin descripción'}</p>
        </div>
      `).join('');
    } else {
      $('eps').innerHTML = '<p>No hay endpoints disponibles.</p>';
    }

  } catch (error) {
    console.error(error);

    $('panel').innerHTML = `
      <div class="card">
        <b>❌ No se pudo cargar el dashboard</b>
        <p>${error.message}</p>
      </div>
    `;
  }
}


async function copyKey() {
  const key = $('key').textContent.trim();

  if (!key || key === '—') {
    alert('❌ No hay una API Key para copiar');
    return;
  }

  try {
    await navigator.clipboard.writeText(key);
    alert('✅ API Key copiada al portapapeles');
  } catch {
    const area = document.createElement('textarea');
    area.value = key;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    alert('✅ API Key copiada al portapapeles');
  }
}

async function gen() {
  if (!S) {
    alert('Primero carga el dashboard');
    return;
  }

  try {
    const d = await call('/dashboard/api/key/generate', {
      method: 'POST'
    });

    if (!d.apiKey) {
      throw new Error(d.error || 'No se pudo generar la API Key');
    }

    $('key').textContent = d.apiKey;

    alert(
      '✅ API Key generada correctamente.\\n\\n' +
      'Guárdala ahora. No se volverá a mostrar completa.'
    );

    await load();

  } catch (error) {
    alert('❌ ' + error.message);
  }
}

async function del() {
  if (!S) {
    alert('Primero carga el dashboard');
    return;
  }

  if (!confirm('¿Seguro que quieres eliminar la API Key activa?')) {
    return;
  }

  try {
    const d = await call('/dashboard/api/key/delete', {
      method: 'DELETE'
    });

    alert(d.message || d.error || 'Operación completada');

    $('key').textContent = '—';

    await load();

  } catch (error) {
    alert('❌ ' + error.message);
  }
}
