// Exportación a Word (.docx) con la librería "docx".
// Módulo compartido: lo usa el navegador (Mis planes, con import dinámico) y
// el script de prueba en Node (scripts/test-docx.mjs). Sin dependencias del DOM.
//
// Entrada:
// {
//   proyecto: "Nombre del proyecto",
//   modo: "proyecto" | "ejemplo",
//   titulo_documento: "Mi plan SEO" | "Plan completo",
//   libro: { titulo, cita_apa, doi, licencia },
//   planes: [{ titulo, capitulo, titulo_capitulo, url, entregables: [{ titulo, origen, contenido, tabla? }] }]
// }
// `contenido` es texto (admite Markdown sencillo: #, ##, -, *, 1.) y `tabla` = { columnas:[], filas:[[]] }.
import {
  AlignmentType, Document, ExternalHyperlink, HeadingLevel, Packer, PageBreak, Paragraph,
  Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx';

function parrafosDeTexto(texto) {
  const out = [];
  const lineas = String(texto || '').replace(/\r\n/g, '\n').split('\n');
  for (const raw of lineas) {
    const l = raw.trimEnd();
    if (!l.trim()) continue;
    let m;
    if ((m = l.match(/^(#{1,3})\s+(.*)$/))) {
      const nivel = [HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5][m[1].length - 1];
      out.push(new Paragraph({ heading: nivel, children: runs(m[2]) }));
    } else if ((m = l.match(/^\s*[-*•]\s+(.*)$/))) {
      out.push(new Paragraph({ bullet: { level: 0 }, children: runs(m[1]) }));
    } else if ((m = l.match(/^\s*(\d+)[.)]\s+(.*)$/))) {
      out.push(new Paragraph({ children: [new TextRun(`${m[1]}. `), ...runs(m[2])] }));
    } else if (/^\s*\|.*\|\s*$/.test(l)) {
      // fila de tabla Markdown suelta: se conserva como texto (las tablas reales van en `tabla`)
      if (!/^\s*\|[\s:|-]+\|\s*$/.test(l)) out.push(new Paragraph({ children: runs(l.trim()) }));
    } else {
      out.push(new Paragraph({ children: runs(l), spacing: { after: 120 } }));
    }
  }
  return out;
}

// **negrita** sencilla
function runs(t) {
  const partes = String(t).split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return partes.map((p) => (p.startsWith('**') && p.endsWith('**') ? new TextRun({ text: p.slice(2, -2), bold: true }) : new TextRun(p)));
}

function tabla(t) {
  const cols = t.columnas || [];
  const filas = t.filas || [];
  const celda = (txt, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(txt ?? ''), bold })] })] });
  const rows = [];
  if (cols.length) rows.push(new TableRow({ tableHeader: true, children: cols.map((c) => celda(c, true)) }));
  for (const f of filas) rows.push(new TableRow({ children: (Array.isArray(f) ? f : [f]).map((c) => celda(c)) }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

export function construirDocumento(entrada) {
  const { proyecto, modo, titulo_documento, libro, planes = [] } = entrada;
  const fecha = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  const hijos = [];
  // Portada
  hijos.push(
    new Paragraph({ spacing: { before: 2400 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: proyecto || 'Mi proyecto', size: 56, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240 }, children: [new TextRun({ text: titulo_documento, size: 40 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240 }, children: [new TextRun({ text: modo === 'ejemplo' ? 'Plan modelo del libro (aulamarketing.digital)' : 'Documento de trabajo editable', italics: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [new TextRun({ text: fecha })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200 }, children: [new TextRun({ text: 'Elaborado con lab.aulamarketing.digital a partir de:', size: 20 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: libro?.titulo || '', size: 20, italics: true })] }),
  );
  planes.forEach((pl, i) => {
    hijos.push(new Paragraph({ children: [new PageBreak()] }));
    hijos.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(pl.titulo)] }));
    if (pl.capitulo) hijos.push(new Paragraph({ children: [new TextRun({ text: `Basado en el capítulo ${pl.capitulo} del libro: ${pl.titulo_capitulo || ''}`, italics: true })] }));
    if (!pl.entregables?.length) {
      hijos.push(new Paragraph({ children: [new TextRun({ text: 'Aún no hay entregables guardados en este plan.', italics: true })] }));
    }
    for (const e of pl.entregables || []) {
      hijos.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 360 }, children: [new TextRun(e.titulo)] }));
      if (e.origen) hijos.push(new Paragraph({ children: [new TextRun({ text: e.origen, size: 18, color: '5B5B63' })] }));
      if (e.tabla) hijos.push(tabla(e.tabla));
      hijos.push(...parrafosDeTexto(e.contenido));
    }
  });
  // Referencia
  hijos.push(new Paragraph({ children: [new PageBreak()] }));
  hijos.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Referencia')] }));
  if (libro?.cita_apa) hijos.push(new Paragraph({ children: [new TextRun(libro.cita_apa)] }));
  if (libro?.doi) hijos.push(new Paragraph({ children: [new ExternalHyperlink({ link: libro.doi, children: [new TextRun({ text: libro.doi, style: 'Hyperlink' })] })] }));
  if (libro?.licencia) hijos.push(new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: `El libro se publica con licencia ${libro.licencia}. Los textos del ejemplo se reproducen con fines formativos y citando la fuente.`, size: 18 })] }));

  return new Document({
    creator: 'lab.aulamarketing.digital',
    title: `${titulo_documento} · ${proyecto || ''}`.trim(),
    description: 'Plan de marketing digital elaborado con lab.aulamarketing.digital',
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{ children: hijos }],
  });
}

export async function aBlob(entrada) {
  return Packer.toBlob(construirDocumento(entrada));
}
export async function aBuffer(entrada) {
  return Packer.toBuffer(construirDocumento(entrada));
}
