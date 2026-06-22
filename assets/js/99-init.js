// ==================== 初始化 ====================
function init() {
  if (!loadGame()) {
    GS = defaultGameState();
    saveGame();
  }
  renderAll();
}
init();
