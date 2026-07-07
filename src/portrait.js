// 成员立绘工具：按好感度 5 档选图，图片不存在时优雅回退 emoji
// 图片约定目录：public/assets/members/{memberId}/{tier}.png + avatar.png
// tier: cold(0-14) / calm(15-39) / care(40-59) / love(60-79) / passion(80+)

export function getMemberPortrait(memberId, aff) {
  if (!memberId) return ''; // BUG-15: 空值防御
  var tier = aff >= 80 ? 'passion' : aff >= 60 ? 'love' : aff >= 40 ? 'care' : aff >= 15 ? 'calm' : 'cold';
  return 'assets/members/' + memberId + '/' + tier + '.png';
}

export function getMemberAvatar(memberId) {
  if (!memberId) return ''; // BUG-15: 空值防御
  return 'assets/members/' + memberId + '/avatar.png';
}

// 生成立绘 img 标签（含 onerror 回退）
export function renderMemberPortrait(memberId, aff, cssClass) {
  var src = getMemberPortrait(memberId, aff);
  var fallbackEmoji = '';
  if (aff >= 80) fallbackEmoji = '❤️🔥';
  else if (aff >= 60) fallbackEmoji = '❤️';
  else if (aff >= 40) fallbackEmoji = '💚';
  else fallbackEmoji = '😐';
  return '<img src="' + src + '" class="' + (cssClass || 'member-portrait') + '" loading="lazy"' +
    ' onerror="this.style.display=\'none\';var s=this.nextElementSibling;if(s)s.style.display=\'inline\'">' +
    '<span style="display:none">' + fallbackEmoji + '</span>';
}

// 生成头像 img 标签
export function renderMemberAvatar(memberId, cssClass) {
  var src = getMemberAvatar(memberId);
  return '<img src="' + src + '" class="' + (cssClass || 'member-avatar') + '" loading="lazy"' +
    ' onerror="this.style.display=\'none\'" style="width:24px;height:24px;border-radius:50%;vertical-align:middle;margin-right:4px">';
}
