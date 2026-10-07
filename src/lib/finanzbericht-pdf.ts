// Erzeugt Finanzbericht-PDFs (Ausfuehrungskosten A1/A2, Einnahmen) bei
// Bedarf/On-Demand direkt aus findeFinanzDownloadKategorie() — denselben
// Zahlen, die die HTML-Berichtsseite fuer dasselbe Verfahren/Kategorie
// anzeigt. Dadurch ist die PDF immer so aktuell wie der letzte naechtliche
// BC-Sync, ohne eigene Vorberechnung/Cron-Job dafuer.
//
// 1:1 aus vtg-rlp/src/lib/finanzbericht-pdf.ts uebernommen (2026-10-07) —
// diese Datei ist vollstaendig generisch/Branding-frei, daher unveraendert
// fuer VTG Nordrhein-Westfalen wiederverwendbar.
//
// Immer werden Laufzeit und Haushaltsjahr nebeneinander auf einer Seite
// gezeigt, alle Gruppen sind vollstaendig aufgeklappt (kein Akkordeon in der
// PDF, anders als auf der Webseite).
//
// Layout bewusst eng gehalten (kleine Schrift/Zeilenabstaende, schmale
// Raender) — A1/A2 sollen komplett auf eine DIN A4-Seite im Querformat
// passen, Einnahmen komplett auf eine Seite im Hochformat. ensureSpace()
// haengt trotzdem noch eine weitere Seite an, falls ein Verfahren
// ausnahmsweise mehr Zeilen hat, als selbst mit diesem engen Layout auf eine
// Seite passen.
import { PDFDocument, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { FinanzDownloadKategorie, FinanzDownloadZeile, FinanzDownloadSpalten } from "@/lib/bc-budget-lines";
import type { Verfahren } from "@/lib/bc-companies";

const PAGE_MARGIN = 24;
const ROW_HEIGHT = 10;
const BODY_SIZE = 6.5;
const HEADER_LABEL_SIZE = 7;
const A4_PORTRAIT: [number, number] = [595.28, 841.89];
const A4_LANDSCAPE: [number, number] = [841.89, 595.28];

function formatEuro(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatEuroOrBlank(n: number | null): string {
  return n === null ? "" : formatEuro(n);
}

function formatProzentOrBlank(n: number | null): string {
  if (n === null) return "";
  return n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export async function generateFinanzberichtPdf(params: {
  verfahren: Verfahren;
  kategorie: FinanzDownloadKategorie;
  orientation: "portrait" | "landscape";
}): Promise<Uint8Array> {
  const { verfahren, kategorie, orientation } = params;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageSize = orientation === "landscape" ? A4_LANDSCAPE : A4_PORTRAIT;
  let page = doc.addPage(pageSize);
  let width = page.getWidth();
  let height = page.getHeight();
  let y = height - PAGE_MARGIN;

  const titel = `${kategorie.titel}${kategorie.suffix ? `/${kategorie.suffix}` : ""}`;

  // Je Ansicht-Block die sichtbaren Unterspalten — bei A2/Einnahmen nur der
  // rohe Betrag (kein Plan/Diff im Original), bei A1 der volle Soll-Ist-Satz.
  // Beschriftungen 1:1 aus dem Original (Ausführungskosten-A1.pdf): die
  // Laufzeit-Seite hat "Gesamt Ausgaben"/"FinPl EUR", die Haushaltsjahr-Seite
  // nur "Ausgaben"/"Jahresprog" (ohne Punkt).
  const vollSpalten = kategorie.vollSpalten;
  type SpaltenKey = keyof FinanzDownloadSpalten;
  const subCols: { key: SpaltenKey; laufzeitLabel: string; haushaltsjahrLabel: string }[] = vollSpalten
    ? [
        { key: "ausgaben", laufzeitLabel: "Gesamt Ausgaben", haushaltsjahrLabel: "Ausgaben" },
        { key: "nichtZuFaehig", laufzeitLabel: "nicht zu.fä.", haushaltsjahrLabel: "nicht zu.fä." },
        { key: "plan", laufzeitLabel: "FinPl EUR", haushaltsjahrLabel: "Jahresprog" },
        { key: "diffEur", laufzeitLabel: "Diff EUR", haushaltsjahrLabel: "Diff EUR" },
        { key: "diffProz", laufzeitLabel: "Diff %", haushaltsjahrLabel: "Diff %" },
      ]
    : [{ key: "ausgaben", laufzeitLabel: "Betrag", haushaltsjahrLabel: "Betrag" }];

  // BLOCK_GAP reserviert echten Leerraum zwischen den Spalten-Bloecken
  // Laufzeit und Haushaltsjahr (nicht nur das kleine Rechts-Padding, das
  // sonst jede Subspalte von der naechsten trennt) — ohne diesen Puffer
  // wuerde die rechte Kante der letzten Laufzeit-Subspalte (rechtsbuendiger
  // Text, z.B. "Diff %"/"Betrag") exakt dort enden, wo auch die Trennlinie
  // zum Haushaltsjahr-Block gezeichnet wird, sodass einzelne Buchstaben
  // (deren Tinten-Breite minimal von der rechnerischen Vorschubbreite
  // abweicht, z.B. "g") die Linie beruehren koennten.
  const BLOCK_GAP = 10;
  const kontoSpalteBreite = vollSpalten ? 150 : 220;
  const nutzbareBreite = width - 2 * PAGE_MARGIN - kontoSpalteBreite - BLOCK_GAP;
  const spaltenAnzahl = subCols.length * 2;
  const spaltenBreite = nutzbareBreite / spaltenAnzahl;
  const kontoX = PAGE_MARGIN;
  const laufzeitStartX = PAGE_MARGIN + kontoSpalteBreite;
  const haushaltsjahrStartX = laufzeitStartX + subCols.length * spaltenBreite + BLOCK_GAP;

  function subX(blockStartX: number, index: number): number {
    return blockStartX + index * spaltenBreite + spaltenBreite - 4;
  }

  function drawText(text: string, x: number, yPos: number, opts: { size?: number; bold?: boolean; align?: "left" | "right" } = {}) {
    const size = opts.size ?? BODY_SIZE;
    const usedFont = opts.bold ? boldFont : font;
    const drawX = opts.align === "right" ? x - usedFont.widthOfTextAtSize(text, size) : x;
    page.drawText(text, { x: drawX, y: yPos, size, font: usedFont, color: rgb(0.1, 0.1, 0.1) });
  }

  // Die vertikalen Trennlinien (Bezeichnung|Laufzeit, Laufzeit|Haushaltsjahr)
  // duerfen keinen Text ueberschneiden. Die Spaltenkoepfe der jeweils ersten
  // Unterspalte ("Gesamt Ausgaben" bzw. "Betrag") sind rechtsbuendig an der
  // Spalte ausgerichtet und je nach Textlaenge breiter als die Spalte selbst
  // — die Linie muss daher links von deren tatsaechlichem Textanfang liegen,
  // nicht nur links vom rechnerischen Spaltenanfang.
  function linkeKanteErsteSpalte(blockStartX: number, label: string): number {
    return subX(blockStartX, 0) - boldFont.widthOfTextAtSize(label, HEADER_LABEL_SIZE);
  }
  const trennX1 =
    Math.min(laufzeitStartX, linkeKanteErsteSpalte(laufzeitStartX, subCols[0].laufzeitLabel)) - 6;
  // Zwischen Laufzeit und Haushaltsjahr steht der reservierte BLOCK_GAP zur
  // Verfuegung (beide Blockgrenzen liegen BLOCK_GAP auseinander) — die Linie
  // liegt in dessen Mitte, ausser das Haushaltsjahr-Label waere so breit,
  // dass es trotzdem noch in den Puffer hineinreicht.
  const haushaltsjahrBlockStart = haushaltsjahrStartX - BLOCK_GAP;
  const trennX2 = Math.min(
    haushaltsjahrBlockStart + BLOCK_GAP / 2,
    linkeKanteErsteSpalte(haushaltsjahrStartX, subCols[0].haushaltsjahrLabel) - 6,
  );

  // Die vertikalen Trennlinien werden NICHT sofort gezeichnet (sonst liefen
  // sie bis zum Seitenrand durch, auch wenn der Inhalt der Seite vorher
  // endet). Stattdessen wird je Seite nur der Startpunkt (Kopfzeile) und
  // laufend der tatsaechlich unterste Zeilen-y-Wert gemerkt; die Linien
  // werden erst am Ende ueber alle Seiten hinweg gezeichnet, exakt bis zur
  // letzten Zeile der jeweiligen Seite.
  const linienKontexte: { page: PDFPage; startY: number; endY: number }[] = [];
  let aktuellerLinienKontext: { page: PDFPage; startY: number; endY: number } | null = null;

  function drawTableHeader() {
    const trennLinienStartY = y + 4;
    drawText("Soll - Ist Vergleich", kontoX, y, { bold: true, size: 8 });
    drawText("Laufzeit", laufzeitStartX, y, { bold: true, size: 8 });
    drawText("Haushaltsjahr", haushaltsjahrStartX, y, { bold: true, size: 8 });
    y -= 10;
    drawText("Bezeichnung", kontoX, y, { bold: true, size: HEADER_LABEL_SIZE });
    for (let i = 0; i < subCols.length; i++) {
      drawText(subCols[i].laufzeitLabel, subX(laufzeitStartX, i), y, {
        bold: true,
        align: "right",
        size: HEADER_LABEL_SIZE,
      });
      drawText(subCols[i].haushaltsjahrLabel, subX(haushaltsjahrStartX, i), y, {
        bold: true,
        align: "right",
        size: HEADER_LABEL_SIZE,
      });
    }
    y -= 5;
    page.drawLine({
      start: { x: PAGE_MARGIN, y },
      end: { x: width - PAGE_MARGIN, y },
      thickness: 0.5,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 10;

    aktuellerLinienKontext = { page, startY: trennLinienStartY, endY: trennLinienStartY };
    linienKontexte.push(aktuellerLinienKontext);
  }

  function ensureSpace(rowHeight: number) {
    if (y - rowHeight < PAGE_MARGIN) {
      page = doc.addPage(pageSize);
      width = page.getWidth();
      height = page.getHeight();
      y = height - PAGE_MARGIN;
      drawTableHeader();
    }
  }

  function drawRow(zeile: FinanzDownloadZeile, opts: { bold?: boolean; fill?: boolean; indent?: boolean } = {}) {
    ensureSpace(ROW_HEIGHT + 2);
    if (opts.fill) {
      page.drawRectangle({
        x: PAGE_MARGIN - 3,
        y: y - 2,
        width: width - 2 * PAGE_MARGIN + 6,
        height: ROW_HEIGHT,
        color: rgb(0.88, 0.88, 0.88),
      });
    }
    drawText(opts.indent ? `  ${zeile.konto}` : zeile.konto, kontoX, y, { bold: opts.bold });
    for (let i = 0; i < subCols.length; i++) {
      const key = subCols[i].key;
      const lWert = zeile.laufzeit[key];
      const hjWert = zeile.haushaltsjahr[key];
      const text = key === "diffProz" ? formatProzentOrBlank(lWert) : formatEuroOrBlank(lWert);
      const hjText = key === "diffProz" ? formatProzentOrBlank(hjWert) : formatEuroOrBlank(hjWert);
      drawText(text, subX(laufzeitStartX, i), y, { bold: opts.bold, align: "right" });
      drawText(hjText, subX(haushaltsjahrStartX, i), y, { bold: opts.bold, align: "right" });
    }
    y -= ROW_HEIGHT;
    if (aktuellerLinienKontext) aktuellerLinienKontext.endY = y + 2;
  }

  drawText(titel, PAGE_MARGIN, y, { size: 12, bold: true });
  y -= 15;
  drawText(`${verfahren.nr} ${verfahren.name}`, PAGE_MARGIN, y, { size: 8, bold: true });
  drawText(`HJ: ${verfahren.hj}`, width - PAGE_MARGIN - 100, y, { size: 6.5 });
  y -= 9;
  drawText(`Stand: ${verfahren.stand}`, width - PAGE_MARGIN - 100, y, { size: 6.5 });
  y -= 10;

  drawTableHeader();

  for (const zeile of kategorie.zeilen) {
    if (zeile.typ === "gruppe") {
      drawRow(zeile, { bold: true, fill: true });
    } else if (zeile.typ === "gesamt" || zeile.typ === "sonder") {
      y -= 2;
      ensureSpace(ROW_HEIGHT + 4);
      page.drawLine({
        start: { x: PAGE_MARGIN, y: y + ROW_HEIGHT - 3 },
        end: { x: width - PAGE_MARGIN, y: y + ROW_HEIGHT - 3 },
        thickness: 0.5,
        color: rgb(0.6, 0.6, 0.6),
      });
      drawRow(zeile, { bold: true, fill: true });
    } else {
      drawRow(zeile, { indent: true });
    }
  }

  // Vertikale Trennlinien jetzt nachtraeglich je Seite zeichnen — von der
  // Kopfzeile bis exakt zur letzten auf dieser Seite gezeichneten Zeile,
  // nicht bis zum Seitenrand.
  for (const kontext of linienKontexte) {
    for (const x of [trennX1, trennX2]) {
      kontext.page.drawLine({
        start: { x, y: kontext.startY },
        end: { x, y: kontext.endY },
        thickness: 0.5,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
  }

  return doc.save();
}
