function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("⚙️ Tealium API Tools")
    .addItem("Run Tag Update + Build Matrix", "runAll")
    .addToUi();
}

function runAll() {
  importCleanTagDetails();
  setupMatrixApiSheet();
}
