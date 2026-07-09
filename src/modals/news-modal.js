import { GS, saveGame } from '../state.js';
import { escHtml, showToast } from '../utils.js';
import { createModal } from './modal-factory.js';

var _switchTabCallback = null;

export function setSwitchOneHeartTab(fn) {
  _switchTabCallback = fn;
}

function switchOneHeartTab(tab) {
  if (typeof _switchTabCallback === 'function') _switchTabCallback(tab);
}

export function showNewsModal() {
  if (GS.gameMode !== 'oneHeart') return;
  var feed = GS.newsFeed || [];
  if (feed.length === 0) {
    showToast('暂无新闻，进入新的一天后刷新');
    return;
  }
  GS._newNews = false;
  saveGame();
  if (window.__renderAll) window.__renderAll();
  var inner = '<div class="modal-content"><h3>📰 娱乐圈今日新闻</h3>';
  inner += '<div style="max-height:65vh;overflow-y:auto;padding:4px 0">';
  for (var i = feed.length - 1; i >= 0; i--) {
    var n = feed[i];
    var isRelated = n.related && (n.related.indexOf('heroine') >= 0 || n.related.indexOf('main') >= 0);
    var sourceEmoji = getSourceEmoji(n.source);
    var timeStr = n.timestamp ? formatTimeAgo(n.timestamp) : '';
    inner += '<div style="background:var(--bg-card);border-radius:10px;padding:12px;margin-bottom:8px;' +
      (isRelated ? 'border-left:3px solid var(--accent-primary)' : 'border-left:3px solid transparent') + '">' +
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">' +
      '<span style="font-size:18px">' + n.emoji + '</span>' +
      '<span style="font-weight:600;font-size:14px;color:var(--text-primary);flex:1">' + escHtml(n.title) + '</span>' +
      '<span style="font-size:10px;color:var(--text-muted);background:var(--bg-secondary);padding:2px 6px;border-radius:4px">' + escHtml(sourceEmoji) + '</span>' +
      '</div>' +
      (n.content ? '<div style="font-size:12px;color:var(--text-muted);margin:4px 0 8px">' + escHtml(n.content) + '</div>' : '') +
      '<div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--text-muted)">' +
      '<span>' + timeStr + '</span>' +
      '<div style="display:flex;gap:6px">' +
      (!n.shared ? '<button class="news-share-btn" data-news-idx="' + i + '" data-action="chat" style="background:none;border:1px solid var(--border-color);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;color:var(--accent-primary)">💬 分享到聊天</button>' : '') +
      (!n.shared ? '<button class="news-share-btn" data-news-idx="' + i + '" data-action="action" style="background:none;border:1px solid var(--border-color);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;color:var(--accent-secondary)">📌 发起行动</button>' : '') +
      (n.shared ? '<span style="font-size:11px;color:#888">✓ 已分享</span>' : '') +
      '</div></div></div>';
  }
  inner += '</div>';
  inner += '<button class="modal-close-x" id="newsClose">✕</button></div>';
  var overlay = createModal(inner);
  overlay.querySelector('#newsClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
  overlay.querySelectorAll('.news-share-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var idx = parseInt(this.dataset.newsIdx);
      var action = this.dataset.action;
      var news = GS.newsFeed[idx];
      if (!news) return;
      news.shared = true;
      if (action === 'chat') {
        saveGame();
        overlay.remove();
        switchOneHeartTab('chat');
        setTimeout(function() {
          var chatInput = document.getElementById('chatInput');
          if (chatInput) {
            chatInput.value = '🎬 看到一条新闻：' + news.title;
            chatInput.focus();
          }
        }, 100);
        showToast('💬 新闻已填充到聊天输入框');
      } else if (action === 'action') {
        saveGame();
        overlay.remove();
        switchOneHeartTab('story');
        setTimeout(function() {
          var freeInput = document.getElementById('freeInput');
          if (freeInput) {
            freeInput.value = '看到一条新闻：' + news.title + (news.content ? '——' + news.content : '');
            freeInput.focus();
          }
        }, 100);
        showToast('📌 新闻已填充到剧情输入框');
      }
      saveGame();
    });
  });
}

function formatTimeAgo(ts) {
  if (!ts) return '';
  var diff = Date.now() - ts;
  var mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + '分钟前';
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + '小时前';
  return Math.floor(hours / 24) + '天前';
}

function getSourceEmoji(src) {
  var map = {
    '热搜榜': '🔥 热搜',
    'D社': '📷 D社',
    '官方': '📢 官方',
    'OSEN': '📰 OSEN',
    '粉丝站': '💎 粉丝站',
    '路透社': '📸 路透',
    '体育京乡': '📰 体育京乡'
  };
  return map[src] || ('📰 ' + (src || '媒体'));
}
