import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, buttonVariants } from '../../src/components/ui/button';
import { Input } from '../../src/components/ui/input';
import { Card, CardContent } from '../../src/components/ui/card';
import { Switch } from '../../src/components/ui/switch';
import '../../src/styles.css';

if (!import.meta.env.DEV) throw new Error('Test harness requires development mode');

function Sample() {
  const [invalid, setInvalid] = useState(false);
  const [value, setValue] = useState('Texto sintético conservado');
  const [loading, setLoading] = useState(false);
  const [submits, setSubmits] = useState(0);
  return <main className="staff-main"><div className="staff-content staff-stack">
    <h1 className="auth-heading">Base visual compartida</h1>
    <a className="staff-back-link" href="#form">Volver al formulario</a>
    <section id="panel" className="staff-panel"><div id="panel-body" className="staff-panel-body staff-stack">
      <h2 className="staff-section-title">Formulario sintético de gestión</h2>
      <form id="form" className="staff-form-fields auth-form" onSubmit={e => e.preventDefault()}>
        <div className="auth-field"><label htmlFor="sample-field">Nombre del registro con una etiqueta suficientemente larga para comprobar el reflujo</label>
          <Input id="sample-field" value={value} onChange={e => setValue(e.target.value)} aria-invalid={invalid} aria-describedby={invalid ? 'field-error' : undefined} />
          {invalid && <p id="field-error">Revisa el dato sintético.</p>}</div>
        <div className="auth-field"><label htmlFor="sample-select">Selector nativo</label><select id="sample-select" className="staff-select" aria-invalid={invalid} aria-describedby={invalid ? 'select-error' : undefined}><option>Opción de prueba</option><option>Otra opción</option></select>{invalid && <p id="select-error">Selecciona un dato válido.</p>}</div>
        <div className="staff-actions"><Button id="primary">Guardar cambios</Button><Button id="secondary" variant="outline" onClick={() => setInvalid(v => !v)}>Alternar error</Button><Button id="disabled" disabled>Acción no disponible</Button></div>
        <p>La acción no está disponible en esta muestra.</p>
        <div className="staff-actions"><Button id="loading" loading={loading} loadingLabel="Guardando cambios de ejemplo…" onClick={() => { setSubmits(n => n + 1); setLoading(true); }}>Guardar</Button><Button id="finish" variant="outline" onClick={() => setLoading(false)}>Finalizar carga sintética</Button></div>
        <p id="submits" role="status">Envíos sintéticos: {submits}</p>
        <Input id="sample-date" type="date" aria-label="Fecha sintética" />
        <Input id="sample-file" type="file" aria-label="Archivo sintético" />
      </form>
    </div></section>
    <section className="staff-panel"><div className="staff-panel-body"><div id="reading" className="staff-detail-content"><h2 className="staff-section-title">Detalle</h2><p>Contenido sintético para comprobar el ancho de lectura y el foco de las acciones sin modificar permisos ni comportamiento.</p><a id="action-link" href="#form" className={buttonVariants()}>Abrir formulario</a></div></div></section>
    <div id="table-region" className="staff-table-region" role="region" aria-label="Tabla de ejemplo" tabIndex={0}><table><thead><tr><th>Nombre</th><th>Curso</th><th>Estado</th></tr></thead><tbody><tr><td>Registro de prueba</td><td>Curso sintético</td><td>Disponible</td></tr></tbody></table></div>
    <Card id="unchanged-card"><CardContent>Tarjeta sin variante de panel.</CardContent></Card>
    <div><Switch id="unchanged-switch" defaultChecked aria-label="Interruptor de referencia" /></div>
  </div></main>;
}
createRoot(document.getElementById('root')!).render(<Sample />);
