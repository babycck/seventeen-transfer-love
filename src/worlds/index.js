import { WORLD_CONFIG as transferHouse } from './transfer-house.js';
import { WORLD_CONFIG as college } from './college.js';
import { WORLD_CONFIG as office } from './office.js';
import { WORLD_CONFIG as neighbor } from './neighbor.js';
import { WORLD_CONFIG as travel } from './travel.js';
import { WORLD_CONFIG as varietyShow } from './variety-show.js';
import { WORLD_CONFIG as entertainment } from './entertainment.js';
import { WORLD_CONFIG as ancient } from './ancient.js';
import { WORLD_CONFIG as esports } from './esports.js';
import { WORLD_CONFIG as apocalypse } from './apocalypse.js';
import { WORLD_CONFIG as custom } from './custom.js';

var CONFIG_MAP = {};
var _all = [transferHouse, college, office, neighbor, travel, varietyShow, entertainment, ancient, esports, apocalypse, custom];
for (var i = 0; i < _all.length; i++) {
  CONFIG_MAP[_all[i].id] = _all[i];
}

export function getWorldConfig(worldId) {
  return CONFIG_MAP[worldId] || null;
}
