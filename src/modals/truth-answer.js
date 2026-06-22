// 真心话回答输入弹窗（Promise 风格）
import { showToast } from '../core.js';

export function showTruthAnswerModal() {
  return new Promise(function(resolve) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    var inner = '<div class="modal-content"><h3>🎙 如实回答</h3>' +
      '<p style="font-size:12px;color:#8b6b6b;margin-bottom:8px">请输入你的回答内容：</p>' +
      '<textarea id="truthAnswerInput" style="width:100%;min-height:120px;border:1.5px solid #e0c0c0;border-radius:10px;padding:10px;font-size:13px;font-family:inherit;resize:vertical;outline:none;" placeholder="写下你的真实回答..."></textarea>' +
      '<div style="display:flex;gap:8px;margin-top:10px">' +
      '<button class="btn-confirm" id="truthSubmit" style="flex:1">提交回答</button>' +
      '<button class="modal-close" id="truthCancel" style="flex:1">取消</button>' +
      '</div></div>';
    overlay.innerHTML = inner;
    document.body.appendChild(overlay);

    var input = overlay.querySelector('#truthAnswerInput');
    input.focus();

    overlay.querySelector('#truthSubmit').addEventListener('click', function() {
      var val = input.value.trim();
      if (!val) {
        showToast('请输入回答内容');
        return;
      }
      overlay.remove();
      resolve(val);
    });

    overlay.querySelector('#truthCancel').addEventListener('click', function() {
      overlay.remove();
      resolve('');
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) { overlay.remove(); resolve(''); }
    });
  });
}
