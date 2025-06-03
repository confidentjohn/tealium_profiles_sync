function setupMatrixApiSheet() {
  const sheetName = 'matrix_api';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  // Create or clear the sheet
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clearContents();
    sheet.clearFormats();
  }

  // Set freeze for rows and columns
  sheet.setFrozenColumns(2); // Columns A:B
  sheet.setFrozenRows(2);    // Rows 1:2

  // Set A3 formula (tag categories)
  sheet.getRange('A3').setFormula('=SORT(UNIQUE(tags!D2:D))');

  // Set C1 formula (tag groups, transposed across)
  sheet.getRange('C1').setFormula('=TRANSPOSE(SORT(UNIQUE(tags!A2:A)))');

  SpreadsheetApp.flush(); // Ensure formulas are evaluated

  // --- Format row 1: rotate text upwards ---
  sheet.getRange(1, 1, 1, sheet.getMaxColumns()).setTextRotation(90);

  // Determine dynamic dimensions
  const maxRows = sheet.getRange('A3:A').getValues().filter(r => r[0] !== '').length;
  const maxCols = sheet.getRange('C1:1').getValues()[0].filter(c => c !== '').length;

  if (maxRows > 0 && maxCols > 0) {
    // --- Fill C3:... with matrix formula ---
    const formulaMatrix = [];
    for (let row = 0; row < maxRows; row++) {
      const rowFormulas = [];
      for (let col = 0; col < maxCols; col++) {
        const colLetter = columnToLetter(col + 3); // column C = 3
        const formula = `=IF(COUNTIFS(tags!$D:$D,$A${row + 3},tags!$A:$A,${colLetter}$1)=0,"","y")`;
        rowFormulas.push(formula);
      }
      formulaMatrix.push(rowFormulas);
    }
    sheet.getRange(3, 3, maxRows, maxCols).setFormulas(formulaMatrix); // C3:...

    // --- Fill B3:B with row totals ---
    const lastMatrixColLetter = columnToLetter(maxCols + 2); // last col in matrix (C = 3)
    const rowTotalFormulas = [];
    for (let row = 0; row < maxRows; row++) {
      const formula = `=IF(A${row + 3}="","",COUNTIFS(C${row + 3}:${lastMatrixColLetter}${row + 3},"y"))`;
      rowTotalFormulas.push([formula]);
    }
    sheet.getRange(3, 2, maxRows, 1).setFormulas(rowTotalFormulas); // B3

    // --- Fill C2:... with column totals ---
    const colTotalFormulas = [];
    for (let col = 0; col < maxCols; col++) {
      const colLetter = columnToLetter(col + 3); // column C = 3
      const formula = `=IF(${colLetter}1="","",COUNTIF(${colLetter}3:${colLetter},"y"))`;
      colTotalFormulas.push(formula);
    }
    sheet.getRange(2, 3, 1, maxCols).setFormulas([colTotalFormulas]); // C2
  }

  // --- Auto-resize all columns to fit content ---
  sheet.autoResizeColumns(1, sheet.getMaxColumns());
}

// Utility to convert column index (1-based) to letter (e.g., 1 = A, 28 = AB)
function columnToLetter(column) {
  let letter = "";
  while (column > 0) {
    let temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = Math.floor((column - 1) / 26);
  }
  return letter;
}
