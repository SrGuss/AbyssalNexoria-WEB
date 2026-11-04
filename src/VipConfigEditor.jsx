import { useEffect, useState } from 'react'
import { Check, ChevronRight, Plus, Save, Trash2, X } from 'lucide-react'

const emptyConfig = { vips: [], kits: [], crates: [] }
const ITEM_ICON_BASE = 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/items/'
const splitLines = value => value.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
const listText = value => (value || []).join('\n')
const copy = value => JSON.parse(JSON.stringify(value))
const blankItem = slot => ({ slot, material: 'DIAMOND', amount: 1, name: '', lore: [], enchantments: [], boundVip: null, customModelData: null, unbreakable: false, itemFlags: [], attributes: [] })
const blankVip = id => ({ id, name: id, group: id, weight: 0, prefix: '', permissions: [], kits: [], kitsOnGrant: [], commandsOnGrant: [], commandsOnExpire: [], replaces: [] })
const blankKit = id => ({ id, name: id, permission: `nexoriavip.kit.${id}`, icon: 'CHEST', cooldown: 0, slot: -1, once: false, commands: [], items: [] })
const blankCrate = id => ({ id, name: id, block: null, rewards: [] })

export default function VipConfigEditor({ api }) {
  const [config, setConfig] = useState(emptyConfig)
  const [revision, setRevision] = useState(0)
  const [appliedRevision, setAppliedRevision] = useState(0)
  const [appliedAt, setAppliedAt] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const [section, setSection] = useState('vips')
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState(null)
  const [newId, setNewId] = useState('')
  const [activeSlot, setActiveSlot] = useState(0)
  const [itemDraft, setItemDraft] = useState(null)
  const [rewardWeight, setRewardWeight] = useState('1')
  const [rewardCommand, setRewardCommand] = useState('')
  const [rewardItem, setRewardItem] = useState(() => blankItem(0))
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadConfig() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(api('/v1/site/admin/vip/config'), { credentials: 'include' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error('Não foi possível carregar a configuração do NexoriaVIP.')
      const next = data.config || emptyConfig
      setConfig(next)
      setRevision(data.revision || 0)
      setAppliedRevision(data.appliedRevision || 0)
      setAppliedAt(data.appliedAt || null)
      setInitialized(data.initialized !== false)
      const list = Array.isArray(next[section]) ? next[section] : []
      const selected = list.find(entry => entry.id === selectedId) || list[0]
      setSelectedId(selected?.id || '')
      setDraft(section === 'settings' ? copy(next.settings) : selected ? copy(selected) : null)
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível carregar a configuração.')
    } finally { setLoading(false) }
  }

  useEffect(() => { loadConfig() }, [])

  useEffect(() => {
    let active = true
    async function refreshStatus() {
      try {
        const response = await fetch(api('/v1/site/admin/vip/config'), { credentials: 'include' })
        const data = await response.json().catch(() => ({}))
        if (active && response.ok) {
          setAppliedRevision(data.appliedRevision || 0)
          setAppliedAt(data.appliedAt || null)
          setInitialized(data.initialized !== false)
        }
      } catch { }
    }
    const timer = window.setInterval(refreshStatus, 5000)
    return () => { active = false; window.clearInterval(timer) }
  }, [api])

  function selectSection(value) {
    setSection(value)
    const selected = Array.isArray(config[value]) ? config[value][0] : null
    setSelectedId(selected?.id || '')
    setDraft(value === 'settings' ? copy(config.settings) : selected ? copy(selected) : null)
    setItemDraft(null)
    setError('')
    setNotice('')
  }

  function selectEntry(entry) {
    setSelectedId(entry.id)
    setDraft(copy(entry))
    setItemDraft(null)
    setError('')
    setNotice('')
  }

  function createDraft() {
    if (!initialized) return setError('Aguarde a primeira sincronização do NexoriaVIP antes de editar.')
    const id = newId.trim().toLowerCase()
    if (!id) return setError('Informe um identificador antes de criar.')
    if (config[section].some(entry => entry.id === id)) return setError('Esse identificador já está em uso.')
    const next = section === 'vips' ? blankVip(id) : section === 'kits' ? blankKit(id) : blankCrate(id)
    setSelectedId(id)
    setDraft(next)
    setNewId('')
    setItemDraft(null)
    setError('')
    setNotice('Novo cadastro iniciado. Salve para aplicar no servidor.')
  }

  async function persist(nextConfig, nextSelection, message) {
    if (!initialized) return setError('Aguarde a primeira sincronização do NexoriaVIP antes de editar.')
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(api('/v1/site/admin/vip/config'), {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedRevision: revision, config: nextConfig }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.status === 409) {
        await loadConfig()
        throw new Error('A configuração mudou em outro lugar. O snapshot atual foi recarregado; revise e salve novamente.')
      }
      if (!response.ok) throw new Error(data.error === 'invalid_vip_config'
        ? 'Configuração inválida. Confira IDs, relações, itens, encantamentos e atributos.'
        : 'Não foi possível salvar a configuração.')
      setConfig(data.config)
      setRevision(data.revision)
      setInitialized(true)
      setAppliedRevision(data.appliedRevision || appliedRevision)
      setAppliedAt(data.appliedAt || appliedAt)
      setSelectedId(nextSelection || '')
      setDraft(section === 'settings' ? copy(data.config.settings)
        : (Array.isArray(data.config[section]) ? data.config[section].find(entry => entry.id === nextSelection) : null) || null)
      setItemDraft(null)
      setNotice(message || 'Alterações salvas. O plugin aplicará a nova revisão no próximo ciclo de sincronização.')
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível salvar.')
    } finally { setBusy(false) }
  }

  function saveEntry(event) {
    event.preventDefault()
    if (!draft) return
    const normalized = section === 'vips'
      ? { ...draft, id: draft.id.toLowerCase(), group: draft.group.toLowerCase() }
      : section === 'kits' ? { ...draft, id: draft.id.toLowerCase(), items: [...draft.items].sort((a, b) => a.slot - b.slot) }
        : { ...draft, id: draft.id.toLowerCase() }
    const next = { ...config, [section]: [...config[section].filter(entry => entry.id !== normalized.id), normalized].sort((a, b) => a.id.localeCompare(b.id)) }
    persist(next, normalized.id, 'Configuração salva e enviada para sincronização.')
  }

  function removeEntry() {
    if (!draft || !window.confirm(`Remover ${draft.name || draft.id}?`)) return
    const next = { ...config, [section]: config[section].filter(entry => entry.id !== draft.id) }
    if (section === 'kits') {
      next.vips = next.vips.map(vip => ({ ...vip, kits: vip.kits.filter(id => id !== draft.id), kitsOnGrant: vip.kitsOnGrant.filter(id => id !== draft.id) }))
    }
    if (section === 'vips') {
      next.vips = next.vips.map(vip => ({ ...vip, replaces: vip.replaces.filter(id => id !== draft.id) }))
      next.kits = next.kits.map(kit => ({ ...kit, items: kit.items.map(item => item.boundVip === draft.id ? { ...item, boundVip: null } : item) }))
      next.crates = next.crates.map(crate => ({ ...crate, rewards: crate.rewards.map(reward => reward.item?.boundVip === draft.id ? { ...reward, item: { ...reward.item, boundVip: null } } : reward) }))
    }
    const nextSelection = next[section][0]?.id || ''
    persist(next, nextSelection, 'Cadastro removido e configuração sincronizada.')
  }

  function saveKitItem() {
    if (!draft || !itemDraft) return
    const items = draft.items.filter(item => item.slot !== activeSlot)
    if (itemDraft.material.trim()) items.push({ ...itemDraft, slot: activeSlot, material: itemDraft.material.trim().toUpperCase() })
    setDraft(current => ({ ...current, items: items.sort((a, b) => a.slot - b.slot) }))
    setItemDraft(null)
  }

  function removeKitItem() {
    if (!draft) return
    setDraft(current => ({ ...current, items: current.items.filter(item => item.slot !== activeSlot) }))
    setItemDraft(null)
  }

  function addReward(kind) {
    if (!draft) return
    const weight = Number(rewardWeight)
    if (!Number.isInteger(weight) || weight < 1 || weight > 1000000) return setError('Peso da recompensa deve estar entre 1 e 1.000.000.')
    const reward = kind === 'command'
      ? { weight, command: rewardCommand.trim(), item: null }
      : { weight, command: null, item: { ...rewardItem, slot: draft.rewards.length } }
    if ((kind === 'command' && !reward.command) || (kind === 'item' && !reward.item.material)) return setError('Preencha os dados da recompensa.')
    setDraft(current => ({ ...current, rewards: [...current.rewards, reward] }))
    setRewardCommand('')
    setRewardWeight('1')
    setRewardItem(blankItem(0))
    setError('')
  }

  const entries = config[section] || []
  const itemAtSlot = draft?.items?.find(item => item.slot === activeSlot)

  return <section className="vip-config-editor">
    <div className="vip-config-heading"><div><div className="section-kicker"><span>NEXORIAVIP · CONFIGURAÇÃO REMOTA</span></div><h2>VIPs, kits e crates</h2><p>Revisão {revision} · aplicada {appliedRevision}{appliedAt ? ` · ${new Date(`${appliedAt.replace(' ', 'T')}Z`).toLocaleString('pt-BR')}` : ''} · {revision === appliedRevision ? 'Sincronizado' : 'Aguardando servidor'}</p></div><button className="refresh-button" onClick={loadConfig} disabled={loading || busy}>Atualizar</button></div>
    <nav className="vip-config-tabs" aria-label="Configuração NexoriaVIP">
      {[['vips', 'VIPs'], ['kits', 'Kits e itens'], ['crates', 'Crates'], ['settings', 'Comportamento'], ['actions', 'Ações do servidor']].map(([value, label]) => <button key={value} className={section === value ? 'active' : ''} onClick={() => selectSection(value)}>{label}</button>)}
    </nav>
    {error && <p className="login-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
    {loading ? <p className="store-status">Carregando configuração…</p> : !initialized ? <p className="admin-lp-warning">Aguardando o NexoriaVIP enviar o snapshot inicial. Nenhuma configuração será sobrescrita.</p> : section === 'actions' ? <VipAdminActions api={api} config={config} /> : section === 'settings' ? <VipSettings config={config} busy={busy} onSave={settings => persist({ ...config, settings }, '', 'Comportamento global sincronizado.')} /> : <div className="vip-config-layout">
      <aside className="vip-config-list">
        <form className="vip-config-create" onSubmit={event => { event.preventDefault(); createDraft() }}><input aria-label="Novo identificador" value={newId} onChange={event => setNewId(event.target.value)} placeholder={section === 'crates' ? 'id_da_crate' : 'id_do_cadastro'} /><button className="store-add" title="Criar" aria-label="Criar"><Plus size={16} /></button></form>
        <div className="vip-config-entries">{entries.map(entry => <button key={entry.id} className={selectedId === entry.id ? 'active' : ''} onClick={() => selectEntry(entry)}><strong>{entry.name || entry.id}</strong><small>{entry.id}</small></button>)}{entries.length === 0 && <p className="admin-empty">Nenhum cadastro.</p>}</div>
      </aside>
      {draft && <form className="vip-config-form" onSubmit={saveEntry}>
        <div className="vip-config-form-heading"><div><strong>{draft.name || draft.id}</strong><small>ID: {draft.id}</small></div><button type="button" className="admin-dismiss" onClick={removeEntry} title="Excluir cadastro" aria-label="Excluir cadastro"><Trash2 size={15} /></button></div>
        {section === 'vips' && <VipFields value={draft} config={config} onChange={setDraft} />}
        {section === 'kits' && <KitFields value={draft} config={config} onChange={setDraft} activeSlot={activeSlot} setActiveSlot={setActiveSlot} itemAtSlot={itemAtSlot} itemDraft={itemDraft} setItemDraft={setItemDraft} saveKitItem={saveKitItem} removeKitItem={removeKitItem} />}
        {section === 'crates' && <CrateFields value={draft} config={config} onChange={setDraft} rewardWeight={rewardWeight} setRewardWeight={setRewardWeight} rewardCommand={rewardCommand} setRewardCommand={setRewardCommand} rewardItem={rewardItem} setRewardItem={setRewardItem} addReward={addReward} />}
        <div className="vip-config-actions"><button className="button button-primary" disabled={busy}>{busy ? 'Sincronizando…' : 'Salvar configuração'} <Save size={15} /></button></div>
      </form>}
    </div>}
  </section>
}

function VipSettings({ config, busy, onSave }) {
  const [settings, setSettings] = useState(() => copy(config.settings || { syncGroupsOnStart: true, boundItems: { soulbound: true, destroyForeign: true, blockAnvil: true } }))
  useEffect(() => { setSettings(copy(config.settings || { syncGroupsOnStart: true, boundItems: { soulbound: true, destroyForeign: true, blockAnvil: true } })) }, [config.settings])
  function updateBound(key, value) {
    setSettings(current => ({ ...current, boundItems: { ...current.boundItems, [key]: value } }))
  }
  return <form className="vip-config-settings" onSubmit={event => { event.preventDefault(); onSave(settings) }}>
    <div><strong>Proteção de itens vinculados</strong><small>Aplica-se aos itens que receberam bind para um VIP.</small></div>
    <label className="vip-config-setting"><input type="checkbox" checked={settings.boundItems.soulbound} onChange={event => updateBound('soulbound', event.target.checked)} /><span><strong>Impedir drop e armazenamento</strong><small>Itens vinculados não podem ser descartados ou guardados em baús.</small></span></label>
    <label className="vip-config-setting"><input type="checkbox" checked={settings.boundItems.destroyForeign} onChange={event => updateBound('destroyForeign', event.target.checked)} /><span><strong>Remover de outro jogador</strong><small>Itens vinculados são destruídos se estiverem com alguém que não seja o dono.</small></span></label>
    <label className="vip-config-setting"><input type="checkbox" checked={settings.boundItems.blockAnvil} onChange={event => updateBound('blockAnvil', event.target.checked)} /><span><strong>Bloquear bigorna</strong><small>Impede renomear, combinar ou encantar itens vinculados na bigorna.</small></span></label>
    <label className="vip-config-setting"><input type="checkbox" checked={settings.syncGroupsOnStart} onChange={event => setSettings(current => ({ ...current, syncGroupsOnStart: event.target.checked }))} /><span><strong>Sincronizar grupos ao iniciar</strong><small>Atualiza grupos e permissões LuckPerms quando o NexoriaVIP inicia.</small></span></label>
    <button className="button button-primary" disabled={busy}>{busy ? 'Sincronizando…' : 'Salvar comportamento'} <Save size={15} /></button>
  </form>
}

function VipFields({ value, config, onChange }) {
  const set = (key, next) => onChange(current => ({ ...current, [key]: next }))
  return <div className="vip-config-fields">
    <label>Nome<input required maxLength={80} value={value.name} onChange={event => set('name', event.target.value)} /></label>
    <label>Grupo LuckPerms<input required maxLength={64} pattern="[A-Za-z0-9._-]{1,64}" value={value.group} onChange={event => set('group', event.target.value)} /></label>
    <label>Peso<input type="number" min="-100000" max="100000" value={value.weight} onChange={event => set('weight', Number(event.target.value))} /></label>
    <label>Prefixo<input maxLength={64} value={value.prefix || ''} onChange={event => set('prefix', event.target.value)} /></label>
    <TextListField label="Permissões" values={value.permissions} onChange={next => set('permissions', next)} />
    <TextListField label="Comandos ao ativar" values={value.commandsOnGrant} onChange={next => set('commandsOnGrant', next)} />
    <TextListField label="Comandos ao expirar" values={value.commandsOnExpire} onChange={next => set('commandsOnExpire', next)} />
    <TextListField label="VIPs substituídos" values={value.replaces} onChange={next => set('replaces', next)} />
    <MultiSelectList label="Kits liberados" options={config.kits.map(kit => kit.id)} values={value.kits} onChange={next => set('kits', next)} />
    <MultiSelectList label="Kits entregues na primeira concessão" options={config.kits.map(kit => kit.id)} values={value.kitsOnGrant} onChange={next => set('kitsOnGrant', next)} />
  </div>
}

function KitFields({ value, config, onChange, activeSlot, setActiveSlot, itemAtSlot, itemDraft, setItemDraft, saveKitItem, removeKitItem }) {
  const set = (key, next) => onChange(current => ({ ...current, [key]: next }))
  const displayedItem = itemDraft || itemAtSlot
  return <div className="vip-config-fields">
    <label>Nome<input required maxLength={80} value={value.name} onChange={event => set('name', event.target.value)} /></label>
    <label>Permissão<input required maxLength={128} value={value.permission} onChange={event => set('permission', event.target.value)} /></label>
    <label>Ícone do menu (material)<input required maxLength={64} value={value.icon} onChange={event => set('icon', event.target.value.toUpperCase())} /></label>
    <div className="vip-config-inline-fields"><label>Cooldown (segundos)<input type="number" min="0" max="31536000" value={value.cooldown} onChange={event => set('cooldown', Number(event.target.value))} /></label><label>Slot no menu<input type="number" min="-1" max="53" value={value.slot} onChange={event => set('slot', Number(event.target.value))} /></label><label className="vip-config-check"><input type="checkbox" checked={value.once} onChange={event => set('once', event.target.checked)} /> Uma vez</label></div>
    <TextListField label="Comandos do kit ({player})" values={value.commands} onChange={next => set('commands', next)} />
    <div className="vip-config-inventory-heading"><strong>Inventário do kit</strong><small>Selecione um slot para editar o item, encantar ou vincular ao VIP.</small></div>
    <div className="vip-config-inventory">{Array.from({ length: 54 }, (_, slot) => {
      const item = value.items.find(entry => entry.slot === slot)
      return <button type="button" key={slot} className={`${item ? 'filled' : ''} ${activeSlot === slot ? 'selected' : ''}`} title={item ? `${item.name || item.material} ×${item.amount}${item.enchantments?.length ? ` · ${item.enchantments.map(enchantment => `${enchantment.id} ${enchantment.level}`).join(', ')}` : ''}${item.lore?.length ? ` · ${item.lore.join(' | ')}` : ''}${item.attributes?.length ? ` · ${item.attributes.map(attribute => `${attribute.id} ${attribute.amount}`).join(', ')}` : ''}${item.boundVip ? ` · Vinculado a ${item.boundVip}` : ''}` : `Slot ${slot + 1} vazio`} aria-label={item ? `${item.name || item.material}, quantidade ${item.amount}` : `Slot ${slot + 1} vazio`} onClick={() => { setActiveSlot(slot); setItemDraft(item ? copy(item) : blankItem(slot)) }}><small>{slot + 1}</small>{item && <img className="vip-config-item-icon" src={`${ITEM_ICON_BASE}${item.material.toLowerCase()}.png`} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none' }} />}<span>{item ? item.material.replace(/_/g, ' ') : ''}</span>{item?.amount > 1 && <b>{item.amount}</b>}</button>
    })}</div>
    {displayedItem && <div className="vip-config-item-builder"><div className="vip-config-form-heading"><strong>Slot {activeSlot + 1} · {displayedItem.material || 'Item'}</strong><button type="button" className="admin-dismiss" onClick={() => setItemDraft(null)} aria-label="Fechar edição"><X size={14} /></button></div><ItemFields key={`kit-slot-${activeSlot}`} item={displayedItem} onChange={setItemDraft} vips={config.vips} /><div className="vip-config-actions"><button type="button" className="button button-primary" onClick={saveKitItem}><Check size={14} /> Aplicar ao slot</button>{itemAtSlot && <button type="button" className="admin-back" onClick={removeKitItem}><Trash2 size={14} /> Remover item</button>}</div></div>}
  </div>
}

function CrateFields({ value, config, onChange, rewardWeight, setRewardWeight, rewardCommand, setRewardCommand, rewardItem, setRewardItem, addReward }) {
  const set = (key, next) => onChange(current => ({ ...current, [key]: next }))
  const block = value.block || { world: '', x: 0, y: 0, z: 0 }
  return <div className="vip-config-fields">
    <label>Nome<input required maxLength={48} value={value.name} onChange={event => set('name', event.target.value)} /></label>
    <div className="vip-config-inline-fields"><label>Mundo<input value={block.world} onChange={event => set('block', { ...block, world: event.target.value })} /></label>{['x','y','z'].map(axis => <label key={axis}>{axis.toUpperCase()}<input type="number" value={block[axis]} onChange={event => set('block', { ...block, [axis]: Number(event.target.value) })} /></label>)}</div>
    <div className="vip-config-rewards"><strong>Recompensas por peso</strong>{value.rewards.map((reward, index) => <article key={`${index}-${reward.weight}`}><span>{index + 1}. peso {reward.weight}</span><small>{reward.command || `${reward.item?.material} ×${reward.item?.amount}${reward.item?.boundVip ? ` · bind ${reward.item.boundVip}` : ''}`}</small><button type="button" className="admin-dismiss" onClick={() => set('rewards', value.rewards.filter((_, position) => position !== index))} aria-label="Remover recompensa"><Trash2 size={14} /></button></article>)}<div className="vip-config-reward-add"><label>Peso<input type="number" min="1" max="1000000" value={rewardWeight} onChange={event => setRewardWeight(event.target.value)} /></label><label>Comando do console (opcional)<input value={rewardCommand} onChange={event => setRewardCommand(event.target.value)} placeholder="give {player} diamond 1" /></label><button type="button" className="refresh-button" onClick={() => addReward('command')}><Plus size={14} /> Adicionar comando</button></div><div className="vip-config-reward-item"><ItemFields item={rewardItem} onChange={setRewardItem} vips={config.vips} /><button type="button" className="refresh-button" onClick={() => addReward('item')}><Plus size={14} /> Adicionar item</button></div></div>
  </div>
}

function VipAdminActions({ api, config }) {
  const [form, setForm] = useState({ action: 'grant_vip', nick: '', vip: '', days: 30, kit: '', crate: '', quantity: 1 })
  const [actions, setActions] = useState([])
  const [playerInfo, setPlayerInfo] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    async function refresh() {
      try {
        const response = await fetch(api('/v1/site/admin/vip/actions'), { credentials: 'include' })
        const data = await response.json().catch(() => ({}))
        if (active && response.ok) setActions(data.actions || [])
      } catch { }
    }
    refresh()
    const timer = window.setInterval(refresh, 5000)
    return () => { active = false; window.clearInterval(timer) }
  }, [api])

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    setPlayerInfo(null)
    try {
      if (form.action === 'info') {
        const response = await fetch(api(`/v1/site/admin/vip/player/${encodeURIComponent(form.nick)}`), { credentials: 'include' })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error('Conta não encontrada.')
        setPlayerInfo(data)
        return
      }
      const body = { action: form.action }
      if (form.action !== 'sync_groups') body.nick = form.nick
      if (['grant_vip', 'revoke_vip'].includes(form.action)) body.vip = form.vip
      if (form.action === 'grant_vip') body.days = Number(form.days)
      if (['give_kit', 'reset_kit'].includes(form.action)) body.kit = form.kit
      if (form.action === 'give_kit') body.quantity = Number(form.quantity)
      if (form.action === 'give_keys') { body.crate = form.crate; body.quantity = Number(form.quantity) }
      const response = await fetch(api('/v1/site/admin/vip/actions'), {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(({ account_not_found: 'Conta não encontrada.', vip_not_found: 'VIP não encontrado na configuração.', kit_not_found: 'Kit não encontrado na configuração.', crate_not_found: 'Crate não encontrada na configuração.', invalid_quantity: 'Quantidade inválida.', invalid_vip_duration: 'Duração inválida.' })[data.error] || 'Não foi possível enfileirar a ação.')
      setNotice(`Ação enfileirada (#${data.id}); o status será atualizado abaixo.`)
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível completar a ação.')
    } finally { setBusy(false) }
  }

  const actionLabel = action => ({ grant_vip: 'Conceder VIP', revoke_vip: 'Remover VIP', give_kit: 'Entregar kit', reset_kit: 'Zerar cooldown de kit', give_keys: 'Entregar keys', sync_groups: 'Sincronizar LuckPerms' })[action] || action
  const statusLabel = status => ({ pending: 'Aguardando servidor', done: 'Concluída', error: 'Falhou' })[status] || status

  return <div className="vip-config-actions-page">
    <form className="vip-admin-action-form" onSubmit={submit}>
      <label>Ação<select value={form.action} onChange={event => { setForm(current => ({ ...current, action: event.target.value })); setPlayerInfo(null) }}><option value="grant_vip">Conceder VIP</option><option value="revoke_vip">Remover VIP</option><option value="give_kit">Entregar kit</option><option value="reset_kit">Zerar cooldown de kit</option><option value="give_keys">Entregar keys</option><option value="info">Consultar VIP do jogador</option><option value="sync_groups">Sincronizar grupos LuckPerms</option></select></label>
      {form.action !== 'sync_groups' && <label>Nick do jogador<input required pattern="\.?[A-Za-z0-9_]{3,16}" value={form.nick} onChange={event => setForm(current => ({ ...current, nick: event.target.value }))} placeholder="Nick cadastrado" /></label>}
      {['grant_vip', 'revoke_vip'].includes(form.action) && <label>VIP<select required value={form.vip} onChange={event => setForm(current => ({ ...current, vip: event.target.value }))}><option value="">Selecione</option>{config.vips.map(vip => <option key={vip.id} value={vip.id}>{vip.name} · {vip.id}</option>)}</select></label>}
      {form.action === 'grant_vip' && <label>Duração em dias<input type="number" min="0" max="3650" value={form.days} onChange={event => setForm(current => ({ ...current, days: event.target.value }))} /><small>0 = permanente</small></label>}
      {['give_kit', 'reset_kit'].includes(form.action) && <label>Kit<select required value={form.kit} onChange={event => setForm(current => ({ ...current, kit: event.target.value }))}><option value="">Selecione</option>{config.kits.map(kit => <option key={kit.id} value={kit.id}>{kit.name} · {kit.id}</option>)}</select></label>}
      {form.action === 'give_keys' && <label>Crate<select required value={form.crate} onChange={event => setForm(current => ({ ...current, crate: event.target.value }))}><option value="">Selecione</option>{config.crates.map(crate => <option key={crate.id} value={crate.id}>{crate.name} · {crate.id}</option>)}</select></label>}
      {['give_kit', 'give_keys'].includes(form.action) && <label>Quantidade<input type="number" min="1" max={form.action === 'give_keys' ? 10000 : 64} value={form.quantity} onChange={event => setForm(current => ({ ...current, quantity: event.target.value }))} /></label>}
      {error && <p className="login-error" role="alert">{error}</p>}{notice && <p className="login-notice" role="status">{notice}</p>}
      <button className="button button-primary" disabled={busy}>{busy ? 'Enviando…' : form.action === 'info' ? 'Consultar' : 'Executar ação'} <ChevronRight size={15} /></button>
      {playerInfo && <article className="vip-player-info"><strong>{playerInfo.nick}</strong><span>{playerInfo.online ? 'Online' : 'Offline'}</span><p>{playerInfo.vip ? `${playerInfo.vip}${playerInfo.vipExpiresAt ? ` · expira ${new Date(playerInfo.vipExpiresAt).toLocaleString('pt-BR')}` : ' · permanente'}` : 'Sem VIP ativo no último perfil sincronizado.'}</p>{playerInfo.vips?.map(vip => <small key={vip.id}>{vip.name} · {vip.expiresAt >= 8.64e15 ? 'permanente' : new Date(vip.expiresAt).toLocaleString('pt-BR')}</small>)}</article>}
    </form>
    <section className="vip-admin-action-history"><div><strong>Últimas ações</strong><small>Atualiza automaticamente</small></div>{actions.map(action => <article key={action.id}><div><strong>{actionLabel(action.payload?.action)} · {action.nick || action.payload?.actor}</strong><small>{new Date(`${String(action.createdAt).replace(' ', 'T')}Z`).toLocaleString('pt-BR')} · #{action.id}</small></div><span className={`admin-action-status ${action.status}`}>{statusLabel(action.status)}</span><small>{action.result || ''}</small></article>)}{actions.length === 0 && <p className="admin-empty">Nenhuma ação recente.</p>}</section>
  </div>
}

function ItemFields({ item, onChange, vips }) {
  const set = (key, value) => onChange(current => ({ ...current, [key]: value }))
  const parseEnchantments = text => text.split(/\r?\n/).filter(Boolean).map(line => {
    const [id, level] = line.split(/[=:]/).map(value => value.trim())
    return { id: (id || '').replace(/^minecraft:/i, '').toLowerCase(), level: Number(level) }
  })
  function updateAttribute(index, key, value) {
    set('attributes', (item.attributes || []).map((attribute, row) => row === index ? { ...attribute, [key]: value } : attribute))
  }
  return <div className="vip-config-item-fields">
    <label>Material<input required maxLength={64} value={item.material} onChange={event => set('material', event.target.value.toUpperCase())} placeholder="DIAMOND_SWORD" /></label>
    <label>Quantidade<input type="number" min="1" max="64" value={item.amount} onChange={event => set('amount', Number(event.target.value))} /></label>
    <label>Nome personalizado<input maxLength={128} value={item.name || ''} onChange={event => set('name', event.target.value)} /></label>
    <label>Lore (uma linha por entrada)<textarea rows={3} value={listText(item.lore)} onChange={event => set('lore', splitLines(event.target.value))} /></label>
    <label>Encantamentos (id:nível, um por linha)<textarea rows={3} value={(item.enchantments || []).map(enchantment => `${enchantment.id}:${enchantment.level}`).join('\n')} onChange={event => set('enchantments', parseEnchantments(event.target.value))} placeholder="sharpness:5\nunbreaking:3" /></label>
    <TextListField label="Flags do item (ex.: HIDE_ENCHANTS)" values={item.itemFlags || []} onChange={next => set('itemFlags', next.map(flag => flag.toUpperCase()))} />
    <label>Vincular ao VIP<select value={item.boundVip || ''} onChange={event => set('boundVip', event.target.value || null)}><option value="">Sem vínculo</option>{vips.map(vip => <option key={vip.id} value={vip.id}>{vip.name} · {vip.id}</option>)}</select></label>
    <label className="vip-config-check"><input type="checkbox" checked={Boolean(item.unbreakable)} onChange={event => set('unbreakable', event.target.checked)} /> Indestrutível</label>
    <label>Custom Model Data<input type="number" min="0" value={item.customModelData ?? ''} onChange={event => set('customModelData', event.target.value === '' ? null : Number(event.target.value))} /></label>
    <div className="vip-config-attributes"><strong>Atributos</strong>{(item.attributes || []).map((attribute, index) => <div key={`${attribute.id}-${index}`}>
      <label>Atributo<input required value={attribute.id} onChange={event => updateAttribute(index, 'id', event.target.value)} placeholder="attack_damage" /></label>
      <label>Valor<input required type="number" step="any" value={attribute.amount} onChange={event => updateAttribute(index, 'amount', Number(event.target.value))} /></label>
      <label>Operação<select value={attribute.operation} onChange={event => updateAttribute(index, 'operation', event.target.value)}><option value="ADD_NUMBER">Somar</option><option value="ADD_SCALAR">Somar percentual</option><option value="ADD_MULTIPLIED_BASE">Multiplicar base</option><option value="ADD_MULTIPLIED_TOTAL">Multiplicar total</option></select></label>
      <label>Slot<select value={attribute.slot} onChange={event => updateAttribute(index, 'slot', event.target.value)}>{['ANY','HAND','OFF_HAND','FEET','LEGS','CHEST','HEAD','BODY'].map(slot => <option key={slot} value={slot}>{slot}</option>)}</select></label>
      <button type="button" className="admin-dismiss" onClick={() => set('attributes', item.attributes.filter((_, row) => row !== index))} aria-label="Remover atributo"><Trash2 size={13} /></button>
    </div>)}<button type="button" className="refresh-button" onClick={() => set('attributes', [...(item.attributes || []), { id: 'attack_damage', amount: 1, operation: 'ADD_NUMBER', slot: 'HAND' }])}><Plus size={13} /> Adicionar atributo</button></div>
  </div>
}

function TextListField({ label, values, onChange }) {
  return <label>{label}<textarea rows={3} value={listText(values)} onChange={event => onChange(splitLines(event.target.value))} /></label>
}

function MultiSelectList({ label, options, values, onChange }) {
  return <fieldset className="vip-config-multi"><legend>{label}</legend>{options.length ? options.map(option => <label key={option}><input type="checkbox" checked={values.includes(option)} onChange={event => onChange(event.target.checked ? [...values, option] : values.filter(value => value !== option))} />{option}</label>) : <small>Nenhum kit cadastrado.</small>}</fieldset>
}
