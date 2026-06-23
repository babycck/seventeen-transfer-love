// 全屏特效框架：关键时刻视觉冲击
// type: 'heartbreak' | 'revelation' | 'milestone80'

export function triggerScreenEffect(type) {
  var overlay = document.createElement('div');
  overlay.className = 'screen-effect-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;pointer-events:none;';

  if (type === 'heartbreak') {
    // 心碎粒子下落
    var particles = document.createElement('div');
    var particleCount = 25;
    for (var i = 0; i < particleCount; i++) {
      var p = document.createElement('span');
      var x = Math.random() * 100;
      var delay = Math.random() * 0.8;
      var dur = 1.2 + Math.random() * 1.5;
      var size = 8 + Math.random() * 16;
      p.style.cssText = 'position:absolute;left:' + x + '%;top:-30px;font-size:' + size + 'px;animation:shatterFall ' + dur + 's ease-in ' + delay + 's forwards;opacity:0;';
      p.textContent = '💔';
      particles.appendChild(p);
    }
    overlay.appendChild(particles);
    document.body.appendChild(overlay);
    setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 2200);
  } else if (type === 'revelation') {
    // X揭露：白色闪屏
    overlay.style.background = 'rgba(255,255,255,0.85)';
    overlay.style.animation = 'revealFlash 1.2s ease-out forwards';
    document.body.appendChild(overlay);
    setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 1300);
  } else if (type === 'milestone80') {
    // 好感度80：金色光效环绕
    overlay.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:60px;animation:milestoneGlow 1.5s ease-out forwards">✨</div>';
    overlay.style.background = 'radial-gradient(circle, rgba(255,215,0,0.25) 0%, transparent 70%)';
    overlay.style.animation = 'milestoneBg 1.5s ease-out forwards';
    document.body.appendChild(overlay);
    setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 1600);
  }
}
