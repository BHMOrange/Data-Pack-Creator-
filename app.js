/* Data Pack Creator — app.js
 * Builds a Minecraft Java Edition data pack in-browser and exports a .zip.
 * Sources: minecraft.wiki/w/Data_pack, minecraft.wiki/w/Pack_format
 */

/* ---------- Pack format reference ---------- */
const PACK_FORMATS = [
  { fmt: 4,  ver: '1.13 – 1.14.4',  note: 'Initial data pack format' },
  { fmt: 5,  ver: '1.15 – 1.16.1',  note: 'Added predicates' },
  { fmt: 6,  ver: '1.16.2 – 1.16.5',note: 'Custom world generation (exp.)' },
  { fmt: 7,  ver: '1.17 – 1.17.1',  note: '/item replaces /replaceitem' },
  { fmt: 8,  ver: '1.18 – 1.18.1',  note: 'Loot table field changes' },
  { fmt: 9,  ver: '1.18.2',         note: '/locate uses structure tags' },
  { fmt: 10, ver: '1.19 – 1.19.3',  note: 'pack.mcmeta filter section' },
  { fmt: 12, ver: '1.19.4',         note: 'Damage types added' },
  { fmt: 15, ver: '1.20 – 1.20.1',  note: 'Sign NBT, any_of predicate' },
  { fmt: 18, ver: '1.20.2',         note: 'Function macros' },
  { fmt: 26, ver: '1.20.3 – 1.20.4',note: 'Stricter text components' },
  { fmt: 41, ver: '1.20.5 – 1.20.6',note: 'Item components, sweeping_edge' },
  { fmt: 48, ver: '1.21 – 1.21.1',  note: 'Data-driven enchantments' },
  { fmt: 57, ver: '1.21.2 – 1.21.3',note: 'New singular folder names' },
  { fmt: 61, ver: '1.21.4',         note: 'Minor format bump' },
  { fmt: 71, ver: '1.21.5',         note: 'Format bump' },
  { fmt: 80, ver: '1.21.6 – 1.21.7',note: 'Format bump' },
  { fmt: 81, ver: '1.21.8',         note: 'Latest stable pre-25w31a' },
];

/* In 1.21+ Mojang renamed several plural folders to singular. */
function folders(fmt){
  if (fmt >= 48) return {
    function: 'function', loot: 'loot_table', adv: 'advancement',
    recipe: 'recipe', tagFn: 'tags/function',
    predicate: 'predicate', itemmod: 'item_modifier', damage: 'damage_type',
    tag: {
      function:    'tags/function',
      block:       'tags/block',
      item:        'tags/item',
      entity_type: 'tags/entity_type',
      fluid:       'tags/fluid',
      game_event:  'tags/game_event',
    },
  };
  return {
    function: 'functions', loot: 'loot_tables', adv: 'advancements',
    recipe: 'recipes', tagFn: 'tags/functions',
    predicate: 'predicates', itemmod: 'item_modifiers', damage: 'damage_type',
    tag: {
      function:    'tags/functions',
      block:       'tags/blocks',
      item:        'tags/items',
      entity_type: 'tags/entity_types',
      fluid:       'tags/fluids',
      game_event:  'tags/game_events',
    },
  };
}

/* ---------- Common items for autocomplete ---------- */
const COMMON_ITEMS = [
  'air','stone','dirt','grass_block','cobblestone','oak_planks','oak_log','sand','gravel','obsidian','glass',
  'diamond','emerald','iron_ingot','gold_ingot','copper_ingot','netherite_ingot','coal','redstone','lapis_lazuli','quartz',
  'diamond_ore','iron_ore','gold_ore','coal_ore','ancient_debris',
  'diamond_sword','diamond_pickaxe','diamond_axe','diamond_shovel','diamond_hoe',
  'iron_sword','iron_pickaxe','golden_apple','enchanted_golden_apple','totem_of_undying',
  'bow','crossbow','arrow','shield','ender_pearl','ender_eye','blaze_rod','blaze_powder',
  'bread','apple','cooked_beef','cooked_porkchop','cake','cookie','melon_slice','golden_carrot',
  'wheat','carrot','potato','beetroot','sugar_cane','bamboo','kelp',
  'water_bucket','lava_bucket','milk_bucket','bucket',
  'tnt','torch','soul_torch','redstone_torch','lantern','soul_lantern',
  'chest','ender_chest','furnace','crafting_table','anvil','beacon','enchanting_table','brewing_stand',
  'oak_log','birch_log','spruce_log','jungle_log','dark_oak_log','acacia_log','mangrove_log','cherry_log',
  'wool','red_wool','blue_wool','green_wool','yellow_wool','black_wool','white_wool',
  'dragon_egg','elytra','nether_star','heart_of_the_sea','nautilus_shell','trident',
].map(s=>'minecraft:'+s);

const COMMON_BLOCKS = COMMON_ITEMS.filter(i=>/(stone|dirt|grass|wood|log|planks|cobblestone|sand|gravel|obsidian|ore|wool|chest|furnace|table|anvil|tnt|torch|lantern|glass|debris)/.test(i));

const COMMON_ENTITIES = [
  'zombie','skeleton','creeper','spider','enderman','witch','blaze','ghast','wither_skeleton','wither',
  'cow','pig','sheep','chicken','horse','wolf','cat','axolotl','allay','frog',
  'villager','iron_golem','snow_golem','warden','elder_guardian','ender_dragon','phantom','drowned','husk','piglin'
].map(s=>'minecraft:'+s);

/* ---------- State ---------- */
const state = {
  meta: {
    name: 'my_first_pack', namespace: 'example',
    desc: 'My first data pack', author: '', fmt: 48,
  },
  functions:    [],
  recipes:      [],
  advancements: [],
  loot:         [],
  tags:         [],   // {id, name, type, entries[]}
  predicates:   [],   // {id, name, type, ...}
  itemmods:     [],   // {id, name, op, ...}
  damage:       [],   // {id, name, message_id, exhaustion, scaling}
};

let uid = 1;
const newId = () => 'i' + (uid++);

/* ---------- Helpers ---------- */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const sanitize = s => (s||'').toLowerCase().replace(/[^a-z0-9_]/g,'_').replace(/^_+|_+$/g,'') || 'unnamed';
const escapeHtml = s => (s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- Example data ---------- */
function loadExample(){
  state.functions = [
    { id:newId(), name:'hello',
      body:'say Hello from your data pack!\ngive @a minecraft:diamond 1',
      onLoad:true, onTick:false },
    { id:newId(), name:'every_tick',
      body:'# Runs every game tick (20/sec). Keep it light!\n# execute as @a at @s run particle minecraft:happy_villager ~ ~1 ~ 0.2 0.2 0.2 0 1',
      onLoad:false, onTick:false },
  ];
  state.recipes = [
    { id:newId(), name:'diamond_from_dirt', type:'crafting_shaped',
      pattern:['DDD','DDD','DDD'], keyChar:'D', ingredient:'minecraft:dirt',
      result:'minecraft:diamond', count:1, experience:0, cookingTime:200 },
  ];
  state.advancements = [
    { id:newId(), name:'got_diamond', title:'Shiny!', desc:'Obtain a diamond.',
      icon:'minecraft:diamond', trigger:'inventory_changed', item:'minecraft:diamond',
      entity:'minecraft:zombie', block:'minecraft:diamond_block', frame:'task', toast:true },
  ];
  state.loot = [
    { id:newId(), name:'gift_drop', rolls:1, entries:[
      { item:'minecraft:cake', weight:1, min:1, max:1 },
      { item:'minecraft:cookie', weight:3, min:1, max:5 },
    ]},
  ];
  state.tags = [
    { id:newId(), name:'shiny_blocks', type:'block',
      entries:['minecraft:diamond_block','minecraft:gold_block','minecraft:emerald_block'] },
  ];
  state.predicates = [
    { id:newId(), name:'half_chance', type:'random_chance', chance:0.5,
      weather:'clear', min:0, max:24000, gamemode:'survival' },
  ];
  state.itemmods = [
    { id:newId(), name:'rename_shiny', op:'set_name', value:'Shiny Item', lore:'Made with DPC', count:1 },
  ];
  state.damage = [
    { id:newId(), name:'spike', message_id:'spike', exhaustion:0.1, scaling:'when_caused_by_living_non_player' },
  ];
  render();
}

/* ---------- File generators ---------- */
function buildPackMcmeta(){
  const out = {
    pack: {
      description: state.meta.desc || '',
      pack_format: Number(state.meta.fmt) || 48,
    }
  };
  if (state.meta.author && state.meta.author.trim()){
    out.pack.description = `${state.meta.desc || ''}\n§7by ${state.meta.author}`;
  }
  return JSON.stringify(out, null, 2) + '\n';
}

function buildFunctionFile(fn){
  return (fn.body || '').replace(/\r\n/g,'\n').trimEnd() + '\n';
}

function buildRecipeJson(r){
  const result = { id: r.result || 'minecraft:diamond', count: Number(r.count)||1 };
  if (r.type === 'crafting_shapeless'){
    return JSON.stringify({
      type: 'minecraft:crafting_shapeless',
      ingredients: [{ item: r.ingredient || 'minecraft:dirt' }],
      result,
    }, null, 2) + '\n';
  }
  if (r.type === 'crafting_shaped'){
    const pat = (r.pattern && r.pattern.length) ? r.pattern : ['DDD','DDD','DDD'];
    const ch  = (r.keyChar || 'D').charAt(0);
    return JSON.stringify({
      type: 'minecraft:crafting_shaped',
      pattern: pat,
      key: { [ch]: { item: r.ingredient || 'minecraft:dirt' } },
      result,
    }, null, 2) + '\n';
  }
  if (r.type === 'stonecutting'){
    return JSON.stringify({
      type: 'minecraft:stonecutting',
      ingredient: { item: r.ingredient || 'minecraft:stone' },
      result: result.id, count: result.count,
    }, null, 2) + '\n';
  }
  if (['smelting','blasting','smoking','campfire_cooking'].includes(r.type)){
    return JSON.stringify({
      type: 'minecraft:' + r.type,
      ingredient: { item: r.ingredient || 'minecraft:iron_ore' },
      result: result.id,
      experience: Number(r.experience) || 0,
      cookingtime: Number(r.cookingTime) || (r.type==='smelting'?200:r.type==='blasting'?100:r.type==='smoking'?100:600),
    }, null, 2) + '\n';
  }
  if (r.type === 'smithing_transform'){
    return JSON.stringify({
      type: 'minecraft:smithing_transform',
      template: { item: 'minecraft:netherite_upgrade_smithing_template' },
      base:     { item: r.base || 'minecraft:diamond_sword' },
      addition: { item: r.ingredient || 'minecraft:netherite_ingot' },
      result,
    }, null, 2) + '\n';
  }
  return '{}\n';
}

function buildAdvancementJson(a){
  const display = {
    icon: { id: a.icon || 'minecraft:diamond' },
    title: a.title || a.name,
    description: a.desc || '',
    frame: a.frame || 'task',
    show_toast: a.toast !== false,
    announce_to_chat: true,
    hidden: false,
  };
  let criteria;
  switch (a.trigger){
    case 'placed_block':
      criteria = { did: { trigger: 'minecraft:placed_block',
        conditions: { location: [{ condition: 'minecraft:block_state_property', block: a.block || 'minecraft:diamond_block' }] } } };
      break;
    case 'player_killed_entity':
      criteria = { did: { trigger: 'minecraft:player_killed_entity',
        conditions: { entity: [{ condition: 'minecraft:entity_properties', predicate: { type: a.entity || 'minecraft:zombie' }, entity: 'this' }] } } };
      break;
    case 'consume_item':
      criteria = { did: { trigger: 'minecraft:consume_item',
        conditions: { item: { items: [ a.item || 'minecraft:apple' ] } } } };
      break;
    case 'location':
      criteria = { did: { trigger: 'minecraft:location', conditions: {} } };
      break;
    case 'inventory_changed':
    default:
      criteria = { got_item: { trigger: 'minecraft:inventory_changed',
        conditions: { items: [{ items: [ a.item || 'minecraft:diamond' ] }] } } };
  }
  return JSON.stringify({ display, criteria }, null, 2) + '\n';
}

function buildLootJson(l){
  const entries = (l.entries||[]).map(e => ({
    type: 'minecraft:item',
    name: e.item || 'minecraft:diamond',
    weight: Number(e.weight) || 1,
    functions: [{
      function: 'minecraft:set_count',
      count: { min: Number(e.min)||1, max: Number(e.max)||1 },
    }],
  }));
  return JSON.stringify({
    type: 'minecraft:generic',
    pools: [{ rolls: Number(l.rolls)||1, entries: entries.length ? entries : [{type:'minecraft:empty'}] }]
  }, null, 2) + '\n';
}

function buildTagJson(entries){
  return JSON.stringify({ values: entries }, null, 2) + '\n';
}

function buildPredicateJson(p){
  switch (p.type){
    case 'random_chance':
      return JSON.stringify({ condition:'minecraft:random_chance', chance: Number(p.chance)||0.5 }, null, 2) + '\n';
    case 'weather_check':
      return JSON.stringify({
        condition:'minecraft:weather_check',
        raining: p.weather === 'raining',
        thundering: p.weather === 'thundering',
      }, null, 2) + '\n';
    case 'time_check':
      return JSON.stringify({
        condition:'minecraft:time_check',
        value: { min: Number(p.min)||0, max: Number(p.max)||24000 },
        period: 24000,
      }, null, 2) + '\n';
    case 'entity_properties':
      return JSON.stringify({
        condition:'minecraft:entity_properties',
        entity:'this',
        predicate:{ player:{ gamemode: p.gamemode || 'survival' } },
      }, null, 2) + '\n';
    default:
      return JSON.stringify({ condition:'minecraft:random_chance', chance:1.0 }, null, 2) + '\n';
  }
}

function buildItemModifierJson(m){
  switch (m.op){
    case 'set_name':
      return JSON.stringify({ function:'minecraft:set_name', name: m.value || 'Renamed' }, null, 2) + '\n';
    case 'set_lore':
      return JSON.stringify({
        function:'minecraft:set_lore', mode:'replace_all',
        lore: (m.lore||'').split('\n').filter(Boolean).map(t => ({text:t})),
      }, null, 2) + '\n';
    case 'set_count':
      return JSON.stringify({ function:'minecraft:set_count', count: Number(m.count)||1 }, null, 2) + '\n';
    case 'enchant_randomly':
      return JSON.stringify({ function:'minecraft:enchant_randomly' }, null, 2) + '\n';
    case 'enchant_with_levels':
      return JSON.stringify({ function:'minecraft:enchant_with_levels', levels: Number(m.count)||30, treasure:false }, null, 2) + '\n';
    default:
      return '{}\n';
  }
}

function buildDamageTypeJson(d){
  return JSON.stringify({
    message_id: d.message_id || sanitize(d.name) || 'custom',
    exhaustion: Number(d.exhaustion)||0,
    scaling:    d.scaling || 'when_caused_by_living_non_player',
  }, null, 2) + '\n';
}

/* Build whole pack as { 'path/to/file': 'contents' } */
function buildPack(){
  const out = {};
  const ns  = sanitize(state.meta.namespace);
  const f   = folders(Number(state.meta.fmt) || 48);

  out['pack.mcmeta'] = buildPackMcmeta();

  for (const fn of state.functions){
    out[`data/${ns}/${f.function}/${sanitize(fn.name)}.mcfunction`] = buildFunctionFile(fn);
  }
  const loadEntries = state.functions.filter(x=>x.onLoad).map(x=>`${ns}:${sanitize(x.name)}`);
  const tickEntries = state.functions.filter(x=>x.onTick).map(x=>`${ns}:${sanitize(x.name)}`);
  if (loadEntries.length) out[`data/minecraft/${f.tagFn}/load.json`] = buildTagJson(loadEntries);
  if (tickEntries.length) out[`data/minecraft/${f.tagFn}/tick.json`] = buildTagJson(tickEntries);

  for (const r of state.recipes) out[`data/${ns}/${f.recipe}/${sanitize(r.name)}.json`] = buildRecipeJson(r);
  for (const a of state.advancements) out[`data/${ns}/${f.adv}/${sanitize(a.name)}.json`] = buildAdvancementJson(a);
  for (const l of state.loot) out[`data/${ns}/${f.loot}/${sanitize(l.name)}.json`] = buildLootJson(l);

  // Custom tags (block/item/entity_type/fluid/game_event/function)
  for (const t of state.tags){
    const folder = (f.tag && f.tag[t.type]) || f.tag.block;
    const entries = (t.entries||[]).filter(Boolean);
    out[`data/${ns}/${folder}/${sanitize(t.name)}.json`] = buildTagJson(entries);
  }
  // Predicates
  for (const p of state.predicates){
    out[`data/${ns}/${f.predicate}/${sanitize(p.name)}.json`] = buildPredicateJson(p);
  }
  // Item modifiers
  for (const m of state.itemmods){
    out[`data/${ns}/${f.itemmod}/${sanitize(m.name)}.json`] = buildItemModifierJson(m);
  }
  // Damage types
  for (const d of state.damage){
    out[`data/${ns}/${f.damage}/${sanitize(d.name)}.json`] = buildDamageTypeJson(d);
  }

  return out;
}

/* ---------- Rendering ---------- */
function render(){
  renderFunctions(); renderRecipes(); renderAdvancements(); renderLoot();
  renderTags(); renderPredicates(); renderItemMods(); renderDamage();
  updateCounts();
  renderPreview();
}

function updateCounts(){
  $('#count-functions').textContent    = state.functions.length;
  $('#count-recipes').textContent      = state.recipes.length;
  $('#count-advancements').textContent = state.advancements.length;
  $('#count-loot').textContent         = state.loot.length;
  $('#count-tags').textContent         = state.tags.length;
  $('#count-predicates').textContent   = state.predicates.length;
  $('#count-itemmods').textContent     = state.itemmods.length;
  $('#count-damage').textContent       = state.damage.length;
}

/* ---- Functions ---- */
const COMMAND_CHIPS = [
  ['Say', 'say Hello world!'],
  ['Give item', 'give @a minecraft:diamond 1'],
  ['Effect', 'effect give @a minecraft:speed 30 1'],
  ['Title', 'title @a title {"text":"Welcome!","color":"green"}'],
  ['TP', 'tp @p 0 100 0'],
  ['Gamemode', 'gamemode creative @a'],
  ['Particle', 'execute as @a at @s run particle minecraft:happy_villager ~ ~1 ~ .2 .2 .2 0 5'],
  ['Setblock', 'setblock ~ ~ ~ minecraft:diamond_block'],
];

function renderFunctions(){
  const root = $('#list-functions');
  if (!state.functions.length){
    root.innerHTML = `<div class="empty">No functions yet. Click <strong>+ Add function</strong> to create one.</div>`;
    return;
  }
  root.innerHTML = state.functions.map(fn => `
    <div class="card" data-id="${fn.id}">
      <div class="card-head">
        <label class="field">
          <span>Function name</span>
          <input data-bind="name" value="${escapeHtml(fn.name)}" placeholder="hello"/>
        </label>
        <button class="btn btn-danger btn-sm" data-remove>Remove</button>
      </div>
      <label class="field">
        <span>Commands (one per line)</span>
        <textarea data-bind="body" placeholder="say Hello!&#10;give @a minecraft:diamond 1">${escapeHtml(fn.body)}</textarea>
        <div class="chips">
          ${COMMAND_CHIPS.map(([label,cmd]) => `<button class="chip" type="button" data-chip="${escapeHtml(cmd)}">+ ${escapeHtml(label)}</button>`).join('')}
        </div>
      </label>
      <div class="checkrow">
        <label><input type="checkbox" data-bind="onLoad" ${fn.onLoad?'checked':''}/> Run on <strong>load</strong></label>
        <label><input type="checkbox" data-bind="onTick" ${fn.onTick?'checked':''}/> Run every <strong>tick</strong></label>
      </div>
    </div>
  `).join('');
}

/* ---- Recipes ---- */
const RECIPE_TYPES = [
  ['crafting_shaped',   'Shaped (3×3 pattern)'],
  ['crafting_shapeless','Shapeless'],
  ['smelting',          'Furnace (smelting)'],
  ['blasting',          'Blast furnace'],
  ['smoking',           'Smoker'],
  ['campfire_cooking',  'Campfire'],
  ['stonecutting',      'Stonecutter'],
  ['smithing_transform','Smithing table'],
];

function renderRecipes(){
  const root = $('#list-recipes');
  if (!state.recipes.length){
    root.innerHTML = `<div class="empty">No recipes yet. Click <strong>+ Add recipe</strong>.</div>`;
    return;
  }
  root.innerHTML = state.recipes.map(r => {
    const cooking  = ['smelting','blasting','smoking','campfire_cooking'].includes(r.type);
    const isShaped = r.type === 'crafting_shaped';
    const isSmith  = r.type === 'smithing_transform';
    return `
    <div class="card" data-id="${r.id}">
      <div class="card-head">
        <label class="field">
          <span>Recipe name</span>
          <input data-bind="name" value="${escapeHtml(r.name)}"/>
        </label>
        <button class="btn btn-danger btn-sm" data-remove>Remove</button>
      </div>
      <div class="field-row">
        <label class="field">
          <span>Type</span>
          <select data-bind="type">
            ${RECIPE_TYPES.map(([v,l])=>`<option value="${v}" ${r.type===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span>${isSmith?'Addition (item)':'Ingredient (item)'}</span>
          <input list="mc-items" data-bind="ingredient" value="${escapeHtml(r.ingredient)}"/>
        </label>
      </div>
      ${isSmith ? `
      <label class="field">
        <span>Base item (the item being upgraded)</span>
        <input list="mc-items" data-bind="base" value="${escapeHtml(r.base||'minecraft:diamond_sword')}"/>
      </label>` : ''}
      ${isShaped ? `
      <div class="field-row">
        <label class="field">
          <span>Pattern — type the key char in each slot, leave empty for none</span>
          <div class="grid-3">
            ${[0,1,2,3,4,5,6,7,8].map(i=>{
              const row=Math.floor(i/3), col=i%3;
              const ch=(r.pattern && r.pattern[row] && r.pattern[row][col]) || ' ';
              return `<input data-pat="${row},${col}" maxlength="1" value="${escapeHtml(ch.trim()? ch:'')}"/>`;
            }).join('')}
          </div>
        </label>
        <label class="field">
          <span>Key character</span>
          <input data-bind="keyChar" value="${escapeHtml(r.keyChar||'D')}" maxlength="1"/>
          <small>Single letter the pattern references.</small>
        </label>
      </div>` : ''}
      <div class="${cooking?'field-row-3':'field-row'}">
        <label class="field">
          <span>Result item</span>
          <input list="mc-items" data-bind="result" value="${escapeHtml(r.result)}"/>
        </label>
        <label class="field">
          <span>Count</span>
          <input type="number" min="1" max="64" data-bind="count" value="${r.count||1}"/>
        </label>
        ${cooking ? `
        <label class="field">
          <span>XP / Time (ticks)</span>
          <div class="grid-3" style="grid-template-columns:1fr 1fr;max-width:160px">
            <input type="number" step="0.1" min="0" data-bind="experience" value="${r.experience||0}"/>
            <input type="number" min="1" data-bind="cookingTime" value="${r.cookingTime||200}"/>
          </div>
        </label>` : ''}
      </div>
    </div>
  `}).join('');
}

/* ---- Advancements ---- */
const ADVANCEMENT_TRIGGERS = [
  ['inventory_changed',   'Obtain item'],
  ['placed_block',        'Place block'],
  ['player_killed_entity','Kill entity'],
  ['consume_item',        'Eat / drink item'],
  ['location',            'Enter location'],
];
const FRAMES = [['task','Task'],['goal','Goal'],['challenge','Challenge']];

function renderAdvancements(){
  const root = $('#list-advancements');
  if (!state.advancements.length){
    root.innerHTML = `<div class="empty">No advancements yet. Click <strong>+ Add advancement</strong>.</div>`;
    return;
  }
  root.innerHTML = state.advancements.map(a => {
    const useItem  = ['inventory_changed','consume_item'].includes(a.trigger);
    const useBlock = a.trigger === 'placed_block';
    const useEnt   = a.trigger === 'player_killed_entity';
    return `
    <div class="card" data-id="${a.id}">
      <div class="card-head">
        <label class="field">
          <span>File name</span>
          <input data-bind="name" value="${escapeHtml(a.name)}"/>
        </label>
        <button class="btn btn-danger btn-sm" data-remove>Remove</button>
      </div>
      <div class="field-row">
        <label class="field">
          <span>Title</span>
          <input data-bind="title" value="${escapeHtml(a.title)}"/>
        </label>
        <label class="field">
          <span>Icon (item)</span>
          <input list="mc-items" data-bind="icon" value="${escapeHtml(a.icon)}"/>
        </label>
      </div>
      <label class="field">
        <span>Description</span>
        <input data-bind="desc" value="${escapeHtml(a.desc)}"/>
      </label>
      <div class="field-row-3">
        <label class="field">
          <span>Trigger</span>
          <select data-bind="trigger">
            ${ADVANCEMENT_TRIGGERS.map(([v,l])=>`<option value="${v}" ${a.trigger===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span>Frame</span>
          <select data-bind="frame">
            ${FRAMES.map(([v,l])=>`<option value="${v}" ${a.frame===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span>Show toast</span>
          <select data-bind="toast">
            <option value="true" ${a.toast?'selected':''}>Yes</option>
            <option value="false" ${!a.toast?'selected':''}>No</option>
          </select>
        </label>
      </div>
      ${useItem ? `
      <label class="field">
        <span>Item to ${a.trigger==='consume_item'?'consume':'obtain'}</span>
        <input list="mc-items" data-bind="item" value="${escapeHtml(a.item)}"/>
      </label>` : ''}
      ${useBlock ? `
      <label class="field">
        <span>Block to place</span>
        <input list="mc-items" data-bind="block" value="${escapeHtml(a.block)}"/>
      </label>` : ''}
      ${useEnt ? `
      <label class="field">
        <span>Entity to kill</span>
        <input list="mc-entities" data-bind="entity" value="${escapeHtml(a.entity)}"/>
      </label>` : ''}
    </div>
  `}).join('');
}

/* ---- Loot ---- */
function renderLoot(){
  const root = $('#list-loot');
  if (!state.loot.length){
    root.innerHTML = `<div class="empty">No loot tables yet. Click <strong>+ Add loot table</strong>.</div>`;
    return;
  }
  root.innerHTML = state.loot.map(l => `
    <div class="card" data-id="${l.id}">
      <div class="card-head">
        <label class="field">
          <span>File name</span>
          <input data-bind="name" value="${escapeHtml(l.name)}"/>
        </label>
        <button class="btn btn-danger btn-sm" data-remove>Remove</button>
      </div>
      <div class="field-row">
        <label class="field">
          <span>Rolls (how many entries are picked)</span>
          <input type="number" min="1" data-bind="rolls" value="${l.rolls||1}"/>
        </label>
        <div></div>
      </div>
      <div class="entry-head">
        <span>Item</span><span>Weight</span><span>Min</span><span>Max</span><span></span>
      </div>
      <div class="entries" data-entries>
        ${(l.entries||[]).map((e,i)=>`
          <div class="entry-row" data-eidx="${i}">
            <input list="mc-items" data-ekey="item"   value="${escapeHtml(e.item)}"/>
            <input type="number" min="1"   data-ekey="weight" value="${e.weight||1}"/>
            <input type="number" min="0"   data-ekey="min"    value="${e.min||1}"/>
            <input type="number" min="1"   data-ekey="max"    value="${e.max||1}"/>
            <button class="entry-x" type="button" data-eremove>✕</button>
          </div>`).join('')}
      </div>
      <div style="margin-top:10px">
        <button class="btn btn-ghost btn-sm" type="button" data-add-entry>+ Add entry</button>
      </div>
    </div>
  `).join('');
}

/* ---- Tags ---- */
const TAG_TYPES = [
  ['block',       'Blocks'],
  ['item',        'Items'],
  ['entity_type', 'Entity types'],
  ['fluid',       'Fluids'],
  ['game_event',  'Game events'],
  ['function',    'Functions'],
];

function renderTags(){
  const root = $('#list-tags');
  if (!state.tags.length){
    root.innerHTML = `<div class="empty">No tags yet. Click <strong>+ Add tag</strong>.</div>`;
    return;
  }
  root.innerHTML = state.tags.map(t => `
    <div class="card" data-id="${t.id}">
      <div class="card-head">
        <label class="field">
          <span>Tag name</span>
          <input data-bind="name" value="${escapeHtml(t.name)}"/>
        </label>
        <button class="btn btn-danger btn-sm" data-remove>Remove</button>
      </div>
      <label class="field">
        <span>Tag type</span>
        <select data-bind="type">
          ${TAG_TYPES.map(([v,l])=>`<option value="${v}" ${t.type===v?'selected':''}>${l}</option>`).join('')}
        </select>
        <small>Stored under <code>data/${escapeHtml(sanitize(state.meta.namespace))}/tags/${escapeHtml(t.type==='entity_type'?'entity_type':t.type)}/</code></small>
      </label>
      <label class="field">
        <span>Entries — one ID per line (e.g. <code>minecraft:diamond_block</code> or <code>#namespace:other_tag</code>)</span>
        <textarea data-bind="entries-text" placeholder="minecraft:stone&#10;minecraft:dirt">${escapeHtml((t.entries||[]).join('\n'))}</textarea>
      </label>
    </div>
  `).join('');
}

/* ---- Predicates ---- */
const PREDICATE_TYPES = [
  ['random_chance',     'Random chance'],
  ['weather_check',     'Weather check'],
  ['time_check',        'Time of day'],
  ['entity_properties', 'Player gamemode'],
];

function renderPredicates(){
  const root = $('#list-predicates');
  if (!state.predicates.length){
    root.innerHTML = `<div class="empty">No predicates yet. Click <strong>+ Add predicate</strong>.</div>`;
    return;
  }
  root.innerHTML = state.predicates.map(p => `
    <div class="card" data-id="${p.id}">
      <div class="card-head">
        <label class="field">
          <span>Predicate name</span>
          <input data-bind="name" value="${escapeHtml(p.name)}"/>
        </label>
        <button class="btn btn-danger btn-sm" data-remove>Remove</button>
      </div>
      <label class="field">
        <span>Type</span>
        <select data-bind="type">
          ${PREDICATE_TYPES.map(([v,l])=>`<option value="${v}" ${p.type===v?'selected':''}>${l}</option>`).join('')}
        </select>
      </label>
      ${p.type==='random_chance' ? `
        <label class="field">
          <span>Chance (0.0 – 1.0)</span>
          <input type="number" step="0.01" min="0" max="1" data-bind="chance" value="${p.chance||0.5}"/>
        </label>` : ''}
      ${p.type==='weather_check' ? `
        <label class="field">
          <span>Weather</span>
          <select data-bind="weather">
            <option value="clear"     ${p.weather==='clear'?'selected':''}>Clear</option>
            <option value="raining"   ${p.weather==='raining'?'selected':''}>Raining</option>
            <option value="thundering" ${p.weather==='thundering'?'selected':''}>Thundering</option>
          </select>
        </label>` : ''}
      ${p.type==='time_check' ? `
        <div class="field-row">
          <label class="field">
            <span>Min time (ticks)</span>
            <input type="number" min="0" max="24000" data-bind="min" value="${p.min||0}"/>
          </label>
          <label class="field">
            <span>Max time (ticks)</span>
            <input type="number" min="0" max="24000" data-bind="max" value="${p.max||24000}"/>
          </label>
        </div>
        <small class="muted">0 = sunrise · 6000 = noon · 13000 = sunset · 18000 = midnight</small>` : ''}
      ${p.type==='entity_properties' ? `
        <label class="field">
          <span>Player gamemode</span>
          <select data-bind="gamemode">
            <option value="survival"  ${p.gamemode==='survival'?'selected':''}>Survival</option>
            <option value="creative"  ${p.gamemode==='creative'?'selected':''}>Creative</option>
            <option value="adventure" ${p.gamemode==='adventure'?'selected':''}>Adventure</option>
            <option value="spectator" ${p.gamemode==='spectator'?'selected':''}>Spectator</option>
          </select>
        </label>` : ''}
    </div>
  `).join('');
}

/* ---- Item modifiers ---- */
const ITEMMOD_OPS = [
  ['set_name',           'Rename item'],
  ['set_lore',           'Set lore'],
  ['set_count',          'Set count'],
  ['enchant_randomly',   'Random enchantment'],
  ['enchant_with_levels','Enchant with levels'],
];

function renderItemMods(){
  const root = $('#list-itemmods');
  if (!state.itemmods.length){
    root.innerHTML = `<div class="empty">No item modifiers yet. Click <strong>+ Add modifier</strong>.</div>`;
    return;
  }
  root.innerHTML = state.itemmods.map(m => `
    <div class="card" data-id="${m.id}">
      <div class="card-head">
        <label class="field">
          <span>Modifier name</span>
          <input data-bind="name" value="${escapeHtml(m.name)}"/>
        </label>
        <button class="btn btn-danger btn-sm" data-remove>Remove</button>
      </div>
      <label class="field">
        <span>Operation</span>
        <select data-bind="op">
          ${ITEMMOD_OPS.map(([v,l])=>`<option value="${v}" ${m.op===v?'selected':''}>${l}</option>`).join('')}
        </select>
      </label>
      ${m.op==='set_name' ? `
        <label class="field">
          <span>New name</span>
          <input data-bind="value" value="${escapeHtml(m.value||'')}" placeholder="Shiny Item"/>
        </label>` : ''}
      ${m.op==='set_lore' ? `
        <label class="field">
          <span>Lore lines (one per line)</span>
          <textarea data-bind="lore" placeholder="Line one&#10;Line two">${escapeHtml(m.lore||'')}</textarea>
        </label>` : ''}
      ${m.op==='set_count' || m.op==='enchant_with_levels' ? `
        <label class="field">
          <span>${m.op==='set_count' ? 'Count' : 'Enchant levels'}</span>
          <input type="number" min="1" max="64" data-bind="count" value="${m.count||1}"/>
        </label>` : ''}
    </div>
  `).join('');
}

/* ---- Damage types ---- */
const SCALING_OPTS = [
  ['never',                              'Never (no difficulty scaling)'],
  ['when_caused_by_living_non_player',   'When caused by living non-player'],
  ['always',                             'Always scale by difficulty'],
];

function renderDamage(){
  const root = $('#list-damage');
  if (!state.damage.length){
    root.innerHTML = `<div class="empty">No damage types yet. Click <strong>+ Add damage type</strong>.</div>`;
    return;
  }
  root.innerHTML = state.damage.map(d => `
    <div class="card" data-id="${d.id}">
      <div class="card-head">
        <label class="field">
          <span>File name</span>
          <input data-bind="name" value="${escapeHtml(d.name)}"/>
        </label>
        <button class="btn btn-danger btn-sm" data-remove>Remove</button>
      </div>
      <div class="field-row">
        <label class="field">
          <span>Message ID (death.attack.&lt;id&gt;)</span>
          <input data-bind="message_id" value="${escapeHtml(d.message_id||'')}"/>
        </label>
        <label class="field">
          <span>Exhaustion (food cost on hit)</span>
          <input type="number" step="0.05" min="0" data-bind="exhaustion" value="${d.exhaustion||0}"/>
        </label>
      </div>
      <label class="field">
        <span>Difficulty scaling</span>
        <select data-bind="scaling">
          ${SCALING_OPTS.map(([v,l])=>`<option value="${v}" ${d.scaling===v?'selected':''}>${l}</option>`).join('')}
        </select>
      </label>
    </div>
  `).join('');
}

/* ---------- Preview ---------- */
let currentPreviewFile = 'pack.mcmeta';

function renderPreview(){
  const files = buildPack();
  $('#tree').innerHTML = treeify(Object.keys(files).sort());
  $('#preview-title').textContent = sanitize(state.meta.name) + '.zip';
  if (!files[currentPreviewFile]) currentPreviewFile = 'pack.mcmeta';
  showFile(currentPreviewFile, files);
}

function showFile(path, files){
  files = files || buildPack();
  if (!files[path]) path = Object.keys(files)[0];
  currentPreviewFile = path;
  $('#file-title').textContent = path;
  $('#file-preview').textContent = files[path];
  // Highlight current in tree
  $$('#tree .file').forEach(el=>{
    el.classList.toggle('cur', el.dataset.path === path);
  });
}

function treeify(paths){
  const root = {};
  for (const p of paths){
    const parts = p.split('/');
    let cur = root;
    parts.forEach((k,i)=>{
      if (i === parts.length-1) cur[k] = p;       // leaf: store full path
      else { cur[k] = cur[k] || {}; cur = cur[k]; }
    });
  }
  const lines = [];
  function walk(node, prefix){
    const keys = Object.keys(node).sort((a,b)=>{
      const aDir = typeof node[a] === 'object', bDir = typeof node[b] === 'object';
      if (aDir && !bDir) return -1;
      if (!aDir && bDir) return 1;
      return a.localeCompare(b);
    });
    keys.forEach((k, i) => {
      const last = i === keys.length-1;
      const branch = last ? '└─ ' : '├─ ';
      const v = node[k];
      const isDir = typeof v === 'object';
      if (isDir){
        lines.push(`${prefix}${branch}<span class="dir">${escapeHtml(k)}/</span>`);
        walk(v, prefix + (last ? '   ' : '│  '));
      } else {
        lines.push(`${prefix}${branch}<span class="file" data-path="${escapeHtml(v)}">${escapeHtml(k)}</span>`);
      }
    });
  }
  walk(root, '');
  return lines.join('\n');
}

/* ---------- Wiring ---------- */
function bindBasics(){
  $('#pack-name').addEventListener('input', e=>{state.meta.name=e.target.value; renderPreview();});
  $('#pack-namespace').addEventListener('input', e=>{state.meta.namespace=e.target.value; renderPreview();});
  $('#pack-desc').addEventListener('input', e=>{state.meta.desc=e.target.value; renderPreview();});
  $('#pack-author').addEventListener('input', e=>{state.meta.author=e.target.value; renderPreview();});
  $('#pack-format').addEventListener('input', e=>{state.meta.fmt=Number(e.target.value)||48; renderPreview();});

  const sel = $('#pack-version');
  for (const p of [...PACK_FORMATS].reverse()){
    const o = document.createElement('option');
    o.value = p.fmt; o.textContent = `Minecraft ${p.ver}  ·  format ${p.fmt}`;
    if (p.fmt === state.meta.fmt) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', e=>{
    state.meta.fmt = Number(e.target.value) || 48;
    $('#pack-format').value = state.meta.fmt;
    render();
  });

  $('#adv-toggle').addEventListener('click', ()=> $('#basics-adv').classList.toggle('hidden'));
}

function bindSidebar(){
  $$('.side-item[data-tab]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.side-item').forEach(b=>b.classList.remove('side-active'));
      btn.classList.add('side-active');
      const name = btn.dataset.tab;
      $$('.tab-panel').forEach(p=>p.classList.toggle('hidden', p.dataset.panel !== name));
    });
  });
  $('#side-clear').addEventListener('click', ()=>{
    if (!confirm('Remove EVERYTHING — all functions, recipes, advancements, loot tables, tags, predicates, item modifiers and damage types?')) return;
    state.functions = []; state.recipes = []; state.advancements = []; state.loot = [];
    state.tags = []; state.predicates = []; state.itemmods = []; state.damage = [];
    render();
  });
  $('#side-example').addEventListener('click', loadExample);
}

function bindCardEvents(){
  // Inputs in cards
  document.body.addEventListener('input', e=>{
    const card = e.target.closest('.card');
    if (!card) return;
    const id = card.dataset.id;
    const list = findList(id); if (!list) return;
    const item = list.find(x=>x.id===id); if (!item) return;

    // Loot entry edit
    if (e.target.dataset.ekey){
      const row = e.target.closest('.entry-row');
      const idx = Number(row.dataset.eidx);
      const k = e.target.dataset.ekey;
      const v = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
      item.entries[idx][k] = v;
      renderPreview();
      return;
    }
    // Pattern grid (recipe shaped)
    if (e.target.dataset.pat){
      const [r,c] = e.target.dataset.pat.split(',').map(Number);
      item.pattern = item.pattern || ['   ','   ','   '];
      const row = (item.pattern[r] || '   ').split('');
      while (row.length < 3) row.push(' ');
      row[c] = (e.target.value || ' ').charAt(0);
      item.pattern[r] = row.slice(0,3).join('');
      renderPreview();
      return;
    }
    const key = e.target.dataset.bind; if (!key) return;
    // Tag entries multi-line textarea -> array
    if (key === 'entries-text'){
      item.entries = e.target.value.split('\n').map(s=>s.trim()).filter(Boolean);
      renderPreview();
      return;
    }
    if (e.target.type === 'checkbox') item[key] = e.target.checked;
    else if (e.target.type === 'number') item[key] = Number(e.target.value);
    else if (e.target.tagName === 'SELECT' && (e.target.value==='true' || e.target.value==='false')) item[key] = (e.target.value==='true');
    else item[key] = e.target.value;
    renderPreview();
  });

  // Selects that change card structure -> re-render
  document.body.addEventListener('change', e=>{
    if (!e.target.matches('select[data-bind]')) return;
    const card = e.target.closest('.card'); if (!card) return;
    const id = card.dataset.id;
    if (state.recipes.some(x=>x.id===id) && e.target.dataset.bind === 'type') renderRecipes();
    if (state.advancements.some(x=>x.id===id) && e.target.dataset.bind === 'trigger') renderAdvancements();
    if (state.tags.some(x=>x.id===id) && e.target.dataset.bind === 'type') renderTags();
    if (state.predicates.some(x=>x.id===id) && e.target.dataset.bind === 'type') renderPredicates();
    if (state.itemmods.some(x=>x.id===id) && e.target.dataset.bind === 'op') renderItemMods();
    renderPreview();
  });

  // Clicks
  document.body.addEventListener('click', e=>{
    if (e.target.matches('[data-remove]')){
      const card = e.target.closest('.card'); const id = card.dataset.id;
      for (const k of ['functions','recipes','advancements','loot','tags','predicates','itemmods','damage'])
        state[k] = state[k].filter(x=>x.id!==id);
      render(); return;
    }
    if (e.target.matches('[data-add]')){ addNew(e.target.dataset.add); return; }
    if (e.target.matches('[data-add-entry]')){
      const card = e.target.closest('.card'); const id = card.dataset.id;
      const l = state.loot.find(x=>x.id===id);
      l.entries = l.entries || [];
      l.entries.push({item:'minecraft:diamond', weight:1, min:1, max:1});
      renderLoot(); renderPreview(); return;
    }
    if (e.target.matches('[data-eremove]')){
      const card = e.target.closest('.card'); const id = card.dataset.id;
      const idx = Number(e.target.closest('.entry-row').dataset.eidx);
      const l = state.loot.find(x=>x.id===id);
      l.entries.splice(idx,1);
      renderLoot(); renderPreview(); return;
    }
    // Chip-insert command
    if (e.target.matches('.chip[data-chip]')){
      const card = e.target.closest('.card'); const id = card.dataset.id;
      const fn = state.functions.find(x=>x.id===id);
      const txt = e.target.dataset.chip;
      fn.body = (fn.body ? fn.body.replace(/\s+$/,'') + '\n' : '') + txt;
      renderFunctions(); renderPreview(); return;
    }
    // Click file in preview tree
    if (e.target.matches('#tree .file[data-path]')){
      showFile(e.target.dataset.path);
    }
  });
}

function findList(id){
  for (const k of ['functions','recipes','advancements','loot','tags','predicates','itemmods','damage'])
    if (state[k].some(x=>x.id===id)) return state[k];
}

function addNew(kind){
  if (kind === 'function'){
    state.functions.push({id:newId(), name:'new_function', body:'say Hello!', onLoad:false, onTick:false});
    renderFunctions();
  } else if (kind === 'recipe'){
    state.recipes.push({id:newId(), name:'new_recipe', type:'crafting_shaped',
      pattern:['III','I I','III'], keyChar:'I', ingredient:'minecraft:iron_ingot',
      result:'minecraft:diamond', count:1, experience:0.7, cookingTime:200});
    renderRecipes();
  } else if (kind === 'advancement'){
    state.advancements.push({id:newId(), name:'new_advancement', title:'New Achievement',
      desc:'Did the thing.', icon:'minecraft:diamond', trigger:'inventory_changed',
      item:'minecraft:diamond', entity:'minecraft:zombie', block:'minecraft:diamond_block',
      frame:'task', toast:true});
    renderAdvancements();
  } else if (kind === 'loot'){
    state.loot.push({id:newId(), name:'new_loot', rolls:1,
      entries:[{item:'minecraft:diamond', weight:1, min:1, max:3}]});
    renderLoot();
  } else if (kind === 'tag'){
    state.tags.push({id:newId(), name:'new_tag', type:'block',
      entries:['minecraft:diamond_block']});
    renderTags();
  } else if (kind === 'predicate'){
    state.predicates.push({id:newId(), name:'new_predicate', type:'random_chance',
      chance:0.5, weather:'clear', min:0, max:24000, gamemode:'survival'});
    renderPredicates();
  } else if (kind === 'itemmod'){
    state.itemmods.push({id:newId(), name:'new_modifier', op:'set_name',
      value:'Renamed', lore:'', count:1});
    renderItemMods();
  } else if (kind === 'damage'){
    state.damage.push({id:newId(), name:'new_damage', message_id:'new_damage',
      exhaustion:0, scaling:'when_caused_by_living_non_player'});
    renderDamage();
  }
  updateCounts();
  renderPreview();
}

/* ---------- Formats grid ---------- */
function renderFormats(){
  const root = $('#format-grid');
  root.innerHTML = [...PACK_FORMATS].reverse().map(p=>`
    <div class="format-card" data-fmt="${p.fmt}">
      <div class="num">format ${p.fmt}</div>
      <div class="ver">Minecraft ${p.ver}</div>
      <div class="note">${escapeHtml(p.note)}</div>
    </div>
  `).join('');
  root.addEventListener('click', e=>{
    const card = e.target.closest('.format-card'); if (!card) return;
    state.meta.fmt = Number(card.dataset.fmt);
    $('#pack-format').value = state.meta.fmt;
    $('#pack-version').value = state.meta.fmt;
    renderPreview();
    document.getElementById('builder').scrollIntoView({behavior:'smooth'});
  });
}

/* ---------- Item autocomplete ---------- */
function buildDatalists(){
  const items = $('#mc-items');
  items.innerHTML = COMMON_ITEMS.map(i=>`<option value="${i}"></option>`).join('');
  // entities datalist
  const ent = document.createElement('datalist');
  ent.id = 'mc-entities';
  ent.innerHTML = COMMON_ENTITIES.map(i=>`<option value="${i}"></option>`).join('');
  document.body.appendChild(ent);
}

/* ---------- Download ---------- */
function bindDownload(){
  $('#download').addEventListener('click', async ()=>{
    const status = $('#status');
    try {
      status.className = 'status muted'; status.textContent = 'Packing…';
      const files = buildPack();
      const zip = new JSZip();
      for (const [path, content] of Object.entries(files)) zip.file(path, content);
      const blob = await zip.generateAsync({type:'blob'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = sanitize(state.meta.name) + '.zip';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 1000);
      status.className = 'status ok';
      status.textContent = `Built ${Object.keys(files).length} files. Drop the .zip into  saves/<world>/datapacks/  then run /reload.`;
    } catch (err){
      status.className = 'status err';
      status.textContent = 'Error: ' + err.message;
    }
  });
}

/* ---------- Init ---------- */
function init(){
  loadExample();
  bindBasics();
  bindSidebar();
  bindCardEvents();
  bindDownload();
  renderFormats();
  buildDatalists();
}
init();
