import { useEffect, useState } from 'react'
import {
  ArrowUpRight, Menu, X, Copy, Check, Shield, Sparkles,
  Sword, Crown, Gem, Compass, ChevronRight, Gamepad2, LogIn, LogOut, LockKeyhole,
  MapPin, Clock3, Coins, Backpack
} from 'lucide-react'

const SERVER_IP = 'abyssalnexoria.blazebr.com:25710'
const ITEM_ICON_BASE = 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/items/'
// O servidor do site repassa /api/* para a API (mesma origem = cookie de sessão funciona)
const api = path => `/api${path}`
const toPlayer = d => ({ id: d.nick, nick: d.nick, syncedAt: d.updatedAt, ...(d.profile || {}) })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const ranks = [
  {
    name: 'Eco',
    subtitle: 'O primeiro passo',
    price: 'R$ 9,90',
    color: 'mint',
    icon: Sparkles,
    perks: ['Prefixo exclusivo', 'Kit inicial especial', 'Acesso a cosméticos básicos'],
  },
  {
    name: 'Arauto',
    subtitle: 'O chamado do abismo',
    price: 'R$ 19,90',
    color: 'blue',
    icon: Sword,
    perks: ['Todos os benefícios Eco', 'Mais opções de personalização', 'Kit de aventura'],
  },
  {
    name: 'Senhor',
    subtitle: 'Domine as sombras',
    price: 'R$ 29,90',
    color: 'violet',
    icon: Shield,
    perks: ['Todos os benefícios Arauto', 'Cosméticos avançados', 'Benefícios extras de progressão'],
    featured: true,
  },
  {
    name: 'Soberano',
    subtitle: 'A coroa esquecida',
    price: 'R$ 39,90',
    color: 'gold',
    icon: Crown,
    perks: ['Todos os benefícios Senhor', 'Efeitos visuais exclusivos', 'Kit premium'],
  },
  {
    name: 'Ascendente',
    subtitle: 'Além dos limites',
    price: 'R$ 49,90',
    color: 'cosmic',
    icon: Gem,
    perks: ['Todos os benefícios Soberano', 'Cosméticos lendários', 'Reconhecimento especial'],
  },
]

function loadMe() {
  return fetch(api('/v1/site/me'), { credentials: 'include' })
    .then(response => response.ok ? response.json() : Promise.reject())
    .then(toPlayer)
    .catch(() => null)
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedRank, setSelectedRank] = useState(null)
  const [player, setPlayer] = useState(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [credentials, setCredentials] = useState({ nick: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [page, setPage] = useState(window.location.hash === '#conta' ? 'account' : window.location.hash === '#admin' ? 'admin' : 'home')

  useEffect(() => {
    // Remove os favicons anteriores
    document.querySelectorAll('link[rel*="icon"]').forEach((icon) => {
      icon.remove();
    });

    // Define o favicon do Abyssal Nexoria
    const favicon = document.createElement("link");

    favicon.rel = "icon";
    favicon.type = "image/png";
    favicon.href = "/favicon.png?v=2";

    document.head.appendChild(favicon);
  }, []);

  useEffect(() => {
    loadMe().then(setPlayer)
  }, [])

  useEffect(() => {
    const syncPage = () => setPage(window.location.hash === '#conta' ? 'account' : window.location.hash === '#admin' ? 'admin' : 'home')
    window.addEventListener('hashchange', syncPage)
    return () => window.removeEventListener('hashchange', syncPage)
  }, [])

  useEffect(() => {
    if (!player?.id || page !== 'account') return
    let active = true
    const refresh = () => loadMe().then(data => { if (active) setPlayer(data) })
    const timer = window.setInterval(refresh, 15000)
    return () => { active = false; window.clearInterval(timer) }
  }, [player?.id, page])

  async function copyIp() {
    try {
      await navigator.clipboard.writeText(SERVER_IP)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Copie o endereço do servidor:', SERVER_IP)
    }
  }

  function startPurchase(rank) {
    setSelectedRank(rank)
    document.getElementById('loja')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function login(event) {
    event.preventDefault()
    setLoggingIn(true)
    setLoginError('')
    try {
      const response = await fetch(api('/v1/site/login'), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) })
      if (response.status === 401) throw new Error('Nick ou senha incorretos.')
      if (response.status === 429) throw new Error('Muitas tentativas. Aguarde alguns minutos.')
      if (!response.ok) throw new Error('Serviço indisponível. Tente novamente em instantes.')
      setPlayer(await loadMe())
      setLoginOpen(false)
      setCredentials({ nick: '', password: '' })
      window.location.hash = 'conta'
    } catch (error) {
      setLoginError(error.message || 'Não foi possível entrar.')
    } finally { setLoggingIn(false) }
  }

  function logout() { fetch(api('/v1/site/logout'), { method: 'POST', credentials: 'include' }); setPlayer(null); window.location.hash = '' }

  async function refreshNow() {
    await fetch(api('/v1/site/refresh'), { method: 'POST', credentials: 'include' }).catch(() => {})
    await sleep(7000) // o Bridge consulta a API a cada ~5 s
    setPlayer(await loadMe())
  }

  function openAccount() {
    if (player) window.location.hash = 'conta'
    else setLoginOpen(true)
  }

  return (
    <div className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <a className="brand" href="#" aria-label="Abyssal Nexoria início">
          <span className="brand-mark"><Compass size={22} /></span>
          <span className="brand-copy">
            <strong>ABYSSAL <em>NEXORIA</em></strong>
            <small>O REINO ALÉM DO VÉU</small>
          </span>
        </a>

        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav className={menuOpen ? 'nav nav-open' : 'nav'}>
          <a href="#" onClick={() => setMenuOpen(false)}>Início</a>
          <a href="#universo" onClick={() => setMenuOpen(false)}>O universo</a>
          <a href="#loja" onClick={() => setMenuOpen(false)}>Loja VIP</a>
          <a href="#como-jogar" onClick={() => setMenuOpen(false)}>Como jogar</a>
          <a className="nav-cta" href="#loja" onClick={() => setMenuOpen(false)}>Explorar loja <ArrowUpRight size={16} /></a>
          <button className="account-link" onClick={openAccount}>{player ? <><Compass size={15} /> Minha conta</> : <><LogIn size={15} /> Minha conta</>}</button>
          {player && <button className="account-link account-logout" onClick={logout}><LogOut size={15} /> Sair</button>}
          <a className="admin-link" href="#admin" onClick={() => setMenuOpen(false)}><LockKeyhole size={14} /> Admin</a>
        </nav>
      </header>

      <main>{page === 'admin' ? <AdminPanel /> : page === 'account' ? (
        player ? <PlayerPanel player={player} onRefresh={refreshNow} /> : <section className="account-gate section-wrap"><span className="login-mark"><Shield size={24} /></span><h1>Área <span>restrita.</span></h1><p>Entre com sua conta do servidor para acessar seu perfil, inventário e progresso.</p><button className="button button-primary" onClick={() => setLoginOpen(true)}>Entrar na conta <LogIn size={17} /></button></section>
      ) : <>
        <section className="hero" id="inicio">
          <div className="hero-grid" />
          <div className="hero-content">
            <div className="eyebrow"><span className="eyebrow-dot" /> UM NOVO MUNDO AGUARDA</div>
            <h1>O abismo<br />esconde <span>lendas.</span></h1>
            <p className="hero-description">
              Atravesse ruínas esquecidas, descubra poderes antigos e escreva
              seu nome na história de um mundo que nunca deixa de surpreender.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#como-jogar">Entrar na aventura <ChevronRight size={18} /></a>
              <a className="button button-ghost" href="#universo"><Compass size={17} /> Conhecer o mundo</a>
            </div>
            <div className="server-chip">
              <span className="server-status"><i /></span>
              <span><strong>Endereço do servidor</strong><small>{SERVER_IP}</small></span>
              <button onClick={copyIp} aria-label="Copiar endereço" title="Copiar endereço">
                {copied ? <Check size={17} /> : <Copy size={17} />}
              </button>
            </div>
            <p className="demo-note">Caso não consiga conectar, chame um administrador.</p>
          </div>
          <div className="hero-art" aria-label="Ilustração abstrata de um cristal mágico">
            <div className="orbit orbit-a" />
            <div className="orbit orbit-b" />
            <div className="rune rune-one">ᚷ</div>
            <div className="rune rune-two">✧</div>
            <div className="crystal-glow" />
            <div className="crystal">
              <div className="crystal-face face-one" />
              <div className="crystal-face face-two" />
              <div className="crystal-face face-three" />
              <div className="crystal-core" />
            </div>
            <div className="art-caption"><span>01 / O DESPERTAR</span><span>✦</span></div>
          </div>
          <div className="hero-bottom"><span>DESCUBRA O DESCONHECIDO</span><span className="scroll-line" /><span>ROLE PARA EXPLORAR</span></div>
        </section>

        <section className="intro section-wrap" id="universo">
          <div className="section-kicker"><span>01</span> UM UNIVERSO À SUA ESPERA</div>
          <div className="intro-layout">
            <h2>Não é apenas<br />um servidor.<br /><span>É outro mundo.</span></h2>
            <div className="intro-copy">
              <p>Uma aventura em constante evolução, onde exploração, progressão e comunidade se encontram. Prepare seu equipamento: há segredos escondidos para quem ousa ir além.</p>
              <div className="feature-list">
                <div><span className="feature-icon"><Compass /></span><span><strong>Explore sem limites</strong><small>Descubra regiões e ruínas misteriosas.</small></span></div>
                <div><span className="feature-icon"><Sword /></span><span><strong>Construa sua lenda</strong><small>Progrida, enfrente desafios e evolua.</small></span></div>
                <div><span className="feature-icon"><Gamepad2 /></span><span><strong>Faça parte da história</strong><small>Uma comunidade moldando o mundo.</small></span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="shop-section" id="loja">
          <div className="section-wrap">
            <div className="section-kicker"><span>02</span> A LOJA DO ABISMO</div>
            <div className="shop-heading">
              <div><h2>Seu próximo nível<br />começa <span>aqui.</span></h2></div>
              <p>Escolha seu rank e prepare-se para viver Nexoria de uma nova perspectiva. Os valores e benefícios abaixo são demonstrativos nesta primeira versão.</p>
            </div>
            <div className="rank-grid">
              {ranks.map((rank, index) => {
                const Icon = rank.icon
                return (
                  <article className={`rank-card ${rank.color} ${rank.featured ? 'rank-featured' : ''} ${selectedRank === rank.name ? 'rank-selected' : ''}`} key={rank.name}>
                    {rank.featured && <div className="popular-tag">MAIS ESCOLHIDO</div>}
                    <div className="rank-top"><span className="rank-icon"><Icon size={24} /></span><span className="rank-number">0{index + 1}</span></div>
                    <p className="rank-subtitle">{rank.subtitle}</p>
                    <h3>{rank.name}</h3>
                    <div className="price">{rank.price}<span> / 30 dias</span></div>
                    <div className="rank-divider" />
                    <ul>{rank.perks.map(perk => <li key={perk}><Check size={15} />{perk}</li>)}</ul>
                    <button className="rank-button" onClick={() => startPurchase(rank.name)}>Escolher rank <ArrowUpRight size={16} /></button>
                  </article>
                )
              })}
            </div>
            <div className="shop-disclaimer">
              <Shield size={17} />
              <p><strong>Compra segura em construção.</strong> O checkout ainda não está conectado. Nenhum pagamento será realizado nesta versão.</p>
            </div>
          </div>
        </section>

        <section className="join-section section-wrap" id="como-jogar">
          <div className="join-card">
            <div className="join-sigil"><Compass size={38} /></div>
            <div className="join-copy">
              <div className="section-kicker"><span>03</span> SUA JORNADA COMEÇA AGORA</div>
              <h2>O abismo está<br /><span>chamando.</span></h2>
              <p>Prepare seu Minecraft, reúna seus amigos e venha descobrir o que existe além do véu.</p>
            </div>
            <div className="join-actions">
              <button className="button button-primary" onClick={copyIp}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Endereço copiado' : 'Copiar endereço'}</button>
              <span>Java / Bedrock — compatibilidade a confirmar</span>
            </div>
          </div>
        </section>
      </>}</main>

      {loginOpen && <div className="login-overlay" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <form className="login-card" onSubmit={login}>
          <button type="button" className="login-close" onClick={() => setLoginOpen(false)} aria-label="Fechar"><X size={19} /></button>
          <span className="login-mark"><Compass size={24} /></span>
          <p className="section-kicker"><span>ÁREA DO JOGADOR</span></p>
          <h2 id="login-title">Sua jornada<br /><span>continua aqui.</span></h2>
          <p>Entre com o mesmo nick e senha do servidor. Jogadores Bedrock: use o nick com o ponto no início.</p>
          <label>Nick<input required value={credentials.nick} onChange={event => setCredentials({ ...credentials, nick: event.target.value })} autoComplete="username" placeholder="Seu nick no Minecraft" /></label>
          <label>Senha<input required type="password" value={credentials.password} onChange={event => setCredentials({ ...credentials, password: event.target.value })} autoComplete="current-password" placeholder="Sua senha" /></label>
          {loginError && <p className="login-error">{loginError}</p>}
          <button className="button button-primary" disabled={loggingIn}>{loggingIn ? 'Entrando...' : 'Entrar na conta'} <ChevronRight size={17} /></button>
        </form>
      </div>}

      <footer className="footer">
        <a className="brand footer-brand" href="#"><span className="brand-mark"><Compass size={20} /></span><span className="brand-copy"><strong>ABYSSAL <em>NEXORIA</em></strong><small>O REINO ALÉM DO VÉU</small></span></a>
        <p>Um mundo de fantasia, feito para exploradores.</p>
        <span className="footer-copy">© {new Date().getFullYear()} Abyssal Nexoria. Projeto independente.</span>
      </footer>
    </div>
  )
}

function PlayerPanel({ player, onRefresh }) {
  const [busy, setBusy] = useState(false)
  const date = value => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Sem dados'
  const num = value => Number.isFinite(value) ? value.toLocaleString('pt-BR') : null
  const loc = player.lastLocation
  const synced = !!(player.lastSeenAt || player.lastLoginAt)
  const list = value => Array.isArray(value) ? value : []
  async function refresh() { setBusy(true); try { await onRefresh() } finally { setBusy(false) } }
  return <section className="account-area section-wrap" id="conta">
    <div className="account-heading"><div><div className="section-kicker"><span>SEU PERFIL · SINCRONIZADO PELO SERVIDOR</span></div><h2>Olá, <span>{player.nick}</span>.</h2></div>
      <div className="profile-badges"><span className={player.online ? 'online-badge' : 'offline-badge'}><i />{player.online ? 'Online no servidor' : 'Offline'}</span><span className="vip-badge"><Crown size={15} /> {player.vip || 'Sem VIP'}</span><button className="refresh-button" onClick={refresh} disabled={busy}>{busy ? 'Pedindo dados ao servidor…' : 'Atualizar agora'}</button></div></div>
    {!synced && <p className="management-notice">Ainda não há dados deste jogador. Entre no servidor e faça login no jogo: o perfil é enviado automaticamente.</p>}
    <div className="account-grid">
      <article className="profile-card"><span className="profile-avatar">{player.nick.replace(/^\./, '').slice(0, 1).toUpperCase()}</span><strong>{player.nick}</strong><small>Nível {player.level ?? 0} · {num(player.totalExperience) ?? 0} XP total · Sincronizado: {date(player.syncedAt)}</small></article>
      <article className="stat-card"><Coins /><span>Saldo</span><strong>{num(player.money) ? `${num(player.money)} moedas` : 'Não sincronizado'}</strong></article>
      <article className="stat-card"><Clock3 /><span>Último login</span><strong>{date(player.lastLoginAt)}</strong></article>
      <article className="stat-card"><MapPin /><span>Última localização</span><strong>{loc ? `${loc.world} · ${loc.x}, ${loc.y}, ${loc.z}` : 'Sem dados'}</strong></article>
      <article className="details-card"><Shield /><div><span>Vida e fome</span><p>{player.health != null ? `Vida ${player.health} · Fome ${player.food}` : 'Sem dados.'}</p></div></article>
      <article className="details-card"><Crown /><div><span>VIP</span><p>{player.vip ? `${player.vip}${player.vipExpiresAt ? ` · vence em ${date(player.vipExpiresAt)}` : ''}` : 'Sem VIP ativo.'}</p></div></article>
      <article className="inventory-card"><div className="inventory-title"><Backpack /><div><span>Inventário</span><small>Atualizado uma vez por dia e ao entrar; use “Atualizar agora” para o estado atual</small></div></div><InventoryGrid items={list(player.inventory)} order={[...Array(27).keys()].map(i => i + 9).concat([...Array(9).keys()])} /></article>
      <article className="inventory-card"><div className="inventory-title"><Backpack /><div><span>Baú do Ender</span></div></div><InventoryGrid items={list(player.enderChest)} order={[...Array(27).keys()]} /></article>
    </div>
  </section>
}

function InventoryGrid({ items, order }) {
  return <div className="minecraft-inventory">{order.map(slot => <InventorySlot key={slot} item={items.find(item => item.slot === slot)} />)}</div>
}

function InventorySlot({ item }) {
  if (!item) return <div className="inventory-slot" title="Slot vazio" />
  const type = String(item.type || '').replace(/^minecraft:/, '').toLowerCase()
  const label = item.name || type.replace(/_/g, ' ')
  const icon = /^[a-z0-9_]+$/.test(type) ? `${ITEM_ICON_BASE}${type}.png` : null
  return <div className="inventory-slot" title={`${label}${item.amount > 1 ? ` (${item.amount})` : ''}`}>
    <span className="inventory-item-fallback" aria-hidden="true">{type.slice(0, 2) || '?'}</span>
    {icon && <img className="minecraft-item" src={icon} alt={label} loading="lazy" decoding="async" draggable="false" onError={event => { event.currentTarget.style.display = 'none' }} />}
    {item.amount > 1 && <strong>{item.amount}</strong>}
  </div>
}

function AdminPanel() {
  const [checking, setChecking] = useState(true)
  const [configured, setConfigured] = useState(false)
  const [admin, setAdmin] = useState(null)
  const [step, setStep] = useState('credentials')
  const [setupRequired, setSetupRequired] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ nick: '', serverPassword: '', token: '', adminPassword: '', confirmation: '' })
  const [tab, setTab] = useState('accounts')
  const [accounts, setAccounts] = useState([])
  const [roles, setRoles] = useState([])
  const [luckPermsCatalog, setLuckPermsCatalog] = useState({ available: false, syncedAt: null, groups: [] })
  const [actions, setActions] = useState([])
  const [staff, setStaff] = useState([])
  const [search, setSearch] = useState('')
  const [reload, setReload] = useState(0)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [actionForm, setActionForm] = useState({ action: 'kick', reason: '', days: '', minutes: 30, roleId: '' })
  const [roleForm, setRoleForm] = useState({ name: '', group: '' })
  const [editingRoleId, setEditingRoleId] = useState(null)
  const [staffForm, setStaffForm] = useState({ nick: '', role: 'moderator' })
  const [temporaryPassword, setTemporaryPassword] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      fetch(api('/v1/site/admin/status')).then(response => response.ok ? response.json() : Promise.reject()),
      fetch(api('/v1/site/admin/me'), { credentials: 'include' }).then(response => response.ok ? response.json() : null).catch(() => null),
    ]).then(([status, session]) => {
      if (!active) return
      setConfigured(status.configured)
      setAdmin(session)
    }).catch(() => {
      if (active) setError('Não foi possível conectar à API.')
    }).finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!admin) return
    let active = true
    const query = encodeURIComponent(search.trim())
    Promise.all([
      fetch(api(`/v1/site/admin/accounts?search=${query}`), { credentials: 'include' }).then(response => response.ok ? response.json() : Promise.reject()),
      fetch(api('/v1/site/admin/roles'), { credentials: 'include' }).then(response => response.ok ? response.json() : Promise.reject()),
      fetch(api('/v1/site/admin/luckperms/groups'), { credentials: 'include' }).then(response => response.ok ? response.json() : Promise.reject()),
      fetch(api('/v1/site/admin/actions'), { credentials: 'include' }).then(response => response.ok ? response.json() : Promise.reject()),
      admin.role === 'owner' ? fetch(api('/v1/site/admin/staff'), { credentials: 'include' }).then(response => response.ok ? response.json() : Promise.reject()) : Promise.resolve(null),
    ]).then(([accountData, roleData, groupsData, actionData, staffData]) => {
      if (!active) return
      setAccounts(accountData.accounts)
      setRoles(roleData.roles)
      setLuckPermsCatalog(groupsData)
      setActions(actionData.actions)
      if (staffData) setStaff(staffData.staff)
    }).catch(() => { if (active) setError('Não foi possível carregar os dados administrativos.') })
    return () => { active = false }
  }, [admin, search, reload])

  function update(event) {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function requestToken(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(api('/v1/site/admin/token'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nick: form.nick, password: form.serverPassword }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(adminError(data.error))
      setSetupRequired(data.setupRequired)
      setStep('verification')
      setNotice('Código gerado. Confira o log da API.')
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível gerar o código.')
    } finally { setBusy(false) }
  }

  async function authenticate(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (setupRequired && form.adminPassword.length < 12) return setError('A senha administrativa precisa ter pelo menos 12 caracteres.')
    if (setupRequired && form.adminPassword === form.serverPassword) return setError('A senha administrativa deve ser diferente da senha do servidor.')
    if (setupRequired && form.adminPassword !== form.confirmation) return setError('As senhas administrativas não coincidem.')

    setBusy(true)
    try {
      const path = setupRequired ? '/v1/site/admin/setup' : '/v1/site/admin/login'
      const response = await fetch(api(path), {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nick: form.nick, password: form.serverPassword, token: form.token, adminPassword: form.adminPassword }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(adminError(data.error))
      setConfigured(true)
      setAdmin({ nick: data.nick, role: data.role })
      setForm({ nick: '', serverPassword: '', token: '', adminPassword: '', confirmation: '' })
    } catch (authError) {
      setError(authError.message || 'Não foi possível autenticar.')
    } finally { setBusy(false) }
  }

  async function logout() {
    await fetch(api('/v1/site/admin/logout'), { method: 'POST', credentials: 'include' }).catch(() => {})
    setAdmin(null)
    setStep('credentials')
    setForm({ nick: '', serverPassword: '', token: '', adminPassword: '', confirmation: '' })
  }

  async function submitAccountAction(event) {
    event.preventDefault()
    if (!selectedAccount) return
    setBusy(true)
    setError('')
    setNotice('')
    setTemporaryPassword('')
    if (['ban', 'unban', 'reset_password'].includes(actionForm.action)
      && !window.confirm(`Confirmar ${actionLabel(actionForm.action).toLowerCase()} de ${selectedAccount.nick}?`)) {
      setBusy(false)
      return
    }
    try {
      const response = await fetch(api(`/v1/site/admin/accounts/${encodeURIComponent(selectedAccount.nick)}/actions`), {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionForm),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(adminError(data.error))
      if (data.temporaryPassword) {
        setTemporaryPassword(data.temporaryPassword)
        setNotice(`Senha temporária de ${selectedAccount.nick}; ela só será exibida agora.`)
      } else {
        setNotice(`${actionLabel(actionForm.action)} enviado para a fila do servidor.`)
      }
      setReload(value => value + 1)
      if (!data.temporaryPassword) setSelectedAccount(null)
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível executar a ação.')
    } finally { setBusy(false) }
  }

  async function createRole(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const editing = editingRoleId != null
      const response = await fetch(api(editing ? `/v1/site/admin/roles/${editingRoleId}` : '/v1/site/admin/roles'), {
        method: editing ? 'PATCH' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(adminError(data.error))
      setRoleForm({ name: '', group: '' })
      setEditingRoleId(null)
      setNotice(editing ? 'Mapeamento atualizado.' : 'Cargo mapeado ao grupo LuckPerms.')
      setReload(value => value + 1)
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível salvar o cargo.')
    } finally { setBusy(false) }
  }

  async function deleteRole(role) {
    if (!window.confirm(`Remover o mapeamento “${role.name}”?`)) return
    const response = await fetch(api(`/v1/site/admin/roles/${role.id}`), { method: 'DELETE', credentials: 'include' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return setError(adminError(data.error))
    setNotice('Mapeamento removido.')
    if (editingRoleId === role.id) { setEditingRoleId(null); setRoleForm({ name: '', group: '' }) }
    setReload(value => value + 1)
  }

  function editRole(role) {
    setEditingRoleId(role.id)
    setRoleForm({ name: role.name, group: role.group })
  }

  async function inviteStaff(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(api('/v1/site/admin/staff'), {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(adminError(data.error))
      setStaffForm({ nick: '', role: 'moderator' })
      setNotice(`${data.nick} convidado como ${staffRoleLabel(data.role)}.`)
      setReload(value => value + 1)
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível convidar esse membro.')
    } finally { setBusy(false) }
  }

  async function changeStaffRole(member, role) {
    if (!window.confirm(`Alterar o papel de ${member.nick} para ${staffRoleLabel(role)}? A sessão atual será encerrada.`)) return
    const response = await fetch(api(`/v1/site/admin/staff/${encodeURIComponent(member.nick)}`), {
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return setError(adminError(data.error))
    setNotice(`Papel de ${member.nick} atualizado.`)
    setReload(value => value + 1)
  }

  async function removeStaff(member) {
    if (!window.confirm(`Revogar o acesso administrativo de ${member.nick}?`)) return
    const response = await fetch(api(`/v1/site/admin/staff/${encodeURIComponent(member.nick)}`), { method: 'DELETE', credentials: 'include' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return setError(adminError(data.error))
    setNotice(`Acesso de ${member.nick} revogado.`)
    setReload(value => value + 1)
  }

  async function copyTemporaryPassword() {
    try {
      await navigator.clipboard.writeText(temporaryPassword)
      setNotice('Senha temporária copiada.')
    } catch {
      window.prompt('Copie a senha temporária:', temporaryPassword)
    }
  }

  if (checking) return <section className="account-gate section-wrap"><span className="login-mark"><LockKeyhole size={24} /></span><p>Verificando acesso administrativo…</p></section>

  if (admin) return <section className="admin-session section-wrap">
    <div className="admin-session-heading"><div><div className="section-kicker"><span>ABYSSAL NEXORIA · ADMINISTRAÇÃO</span></div><h1>Painel <span>administrativo.</span></h1></div><button className="refresh-button" onClick={logout}><LogOut size={15} /> Sair</button></div>
    <div className="admin-session-panel"><span className="login-mark"><Shield size={22} /></span><div><strong>{admin.nick}</strong><small>{staffRoleLabel(admin.role || 'owner')}</small></div><span className="admin-session-status">Autenticado</span></div>
    <nav className="admin-tabs" aria-label="Seções administrativas">
      {[['accounts', 'Contas'], ['actions', 'Atividades'], ...(admin.role === 'owner' ? [['roles', 'Cargos'], ['staff', 'Equipe']] : [])].map(([key, label]) => <button key={key} className={tab === key ? 'admin-tab active' : 'admin-tab'} onClick={() => setTab(key)}>{label}</button>)}
    </nav>
    {error && <p className="login-error" role="alert">{error}</p>}
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    {temporaryPassword && <div className="admin-temporary-password"><code>{temporaryPassword}</code><button className="refresh-button" onClick={copyTemporaryPassword}><Copy size={14} /> Copiar</button><button className="admin-dismiss" onClick={() => setTemporaryPassword('')} aria-label="Ocultar senha"><X size={15} /></button></div>}
    {tab === 'accounts' && <div className="admin-workspace">
      <div className="admin-toolbar"><label>Buscar conta<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nick do servidor" /></label><button className="refresh-button" onClick={() => setReload(value => value + 1)}>Atualizar</button></div>
      <div className="admin-account-list">{accounts.map(account => <article className="admin-account-row" key={account.id}>
        <div><strong>{account.nick}</strong><small>{account.profile?.online ? 'Online' : 'Offline'} · {account.profile?.level != null ? `Nível ${account.profile.level}` : 'Sem perfil sincronizado'}</small></div>
        <div><small>{account.uuid || 'UUID pendente'}</small><small>{account.updatedAt ? `Sincronizado ${account.updatedAt}` : 'Nunca sincronizado'}</small></div>
        <button className="refresh-button" onClick={() => { setSelectedAccount(account); setActionForm({ action: 'kick', reason: '', days: '', minutes: 30, roleId: roles[0]?.id || '' }); setTemporaryPassword('') }}>Gerenciar</button>
      </article>)}{accounts.length === 0 && <p className="admin-empty">Nenhuma conta encontrada.</p>}</div>
      {selectedAccount && <form className="admin-action-form" onSubmit={submitAccountAction}>
        <div className="admin-form-heading"><div><span>AÇÃO PARA</span><strong>{selectedAccount.nick}</strong></div><button type="button" className="admin-dismiss" onClick={() => setSelectedAccount(null)} aria-label="Fechar"><X size={16} /></button></div>
        <label>Ação<select value={actionForm.action} onChange={event => setActionForm(current => ({ ...current, action: event.target.value }))}>
          {staffActions(admin.role).map(value => <option key={value} value={value}>{actionLabel(value)}</option>)}
        </select></label>
        {['ban', 'kick', 'mute', 'warn'].includes(actionForm.action) && <label>Motivo<textarea required maxLength={200} value={actionForm.reason} onChange={event => setActionForm(current => ({ ...current, reason: event.target.value }))} rows={2} /></label>}
        {actionForm.action === 'ban' && <label>Duração em dias <small>(vazio = permanente)</small><input type="number" min="1" max="3650" value={actionForm.days} onChange={event => setActionForm(current => ({ ...current, days: event.target.value }))} /></label>}
        {actionForm.action === 'mute' && <label>Duração em minutos<input type="number" required min="1" max="525600" value={actionForm.minutes} onChange={event => setActionForm(current => ({ ...current, minutes: event.target.value }))} /></label>}
        {actionForm.action === 'set_role' && <label>Cargo<select required value={actionForm.roleId} onChange={event => setActionForm(current => ({ ...current, roleId: event.target.value }))}><option value="">Selecione</option>{roles.map(role => <option key={role.id} value={role.id}>{role.name} · {role.group}</option>)}</select></label>}
        <div className="admin-form-actions"><button className="button button-primary" type="submit" disabled={busy || (actionForm.action === 'set_role' && roles.length === 0)}>{busy ? 'Enviando…' : actionLabel(actionForm.action)} <ChevronRight size={17} /></button><button type="button" className="admin-back" onClick={() => setSelectedAccount(null)}>Cancelar</button></div>
      </form>}
    </div>}
    {tab === 'roles' && <div className="admin-workspace">
      <div className="admin-lp-status"><div><strong>{luckPermsCatalog.available ? `${luckPermsCatalog.groups.length} grupos detectados` : 'LuckPerms indisponível'}</strong><small>{luckPermsCatalog.syncedAt ? `Sincronizado ${luckPermsCatalog.syncedAt}` : 'Aguardando sincronização da Bridge'}</small></div><button className="refresh-button" onClick={() => setReload(value => value + 1)}>Atualizar lista</button></div>
      {!luckPermsCatalog.available && <p className="admin-lp-warning">Confirme que LuckPerms e a NexoriaBridge atualizada estão ativos no servidor.</p>}
      <form className="admin-role-form" onSubmit={createRole}><label>Nome do cargo<input required minLength={2} maxLength={32} value={roleForm.name} onChange={event => setRoleForm(current => ({ ...current, name: event.target.value }))} placeholder="Ex.: Guardião" /></label><label>Grupo LuckPerms<select required disabled={!luckPermsCatalog.available} value={roleForm.group} onChange={event => setRoleForm(current => ({ ...current, group: event.target.value }))}><option value="">Selecione um grupo</option>{roleForm.group && !luckPermsCatalog.groups.includes(roleForm.group) && <option value={roleForm.group}>{roleForm.group} · grupo não encontrado</option>}{luckPermsCatalog.groups.filter(group => group.toLowerCase() !== 'default').map(group => <option key={group} value={group}>{group}</option>)}</select></label><div className="admin-role-form-actions"><button className="button button-primary" type="submit" disabled={busy || !luckPermsCatalog.available || !roleForm.group}>{busy ? 'Salvando…' : editingRoleId ? 'Salvar mapping' : 'Adicionar cargo'} <ChevronRight size={17} /></button>{editingRoleId && <button className="admin-back" type="button" onClick={() => { setEditingRoleId(null); setRoleForm({ name: '', group: '' }) }}>Cancelar edição</button>}</div></form>
      <div className="admin-role-list">{roles.map(role => <article className="admin-role-row" key={role.id}><div><strong>{role.name}</strong><small>{luckPermsCatalog.groups.includes(role.group) ? 'Grupo detectado' : 'Grupo não encontrado no LuckPerms'}</small></div><code>{role.group}</code><div className="admin-role-actions"><button className="refresh-button" onClick={() => editRole(role)}>Editar</button><button className="admin-dismiss" onClick={() => deleteRole(role)} aria-label={`Remover ${role.name}`} title="Remover mapeamento"><X size={16} /></button></div></article>)}{roles.length === 0 && <p className="admin-empty">Nenhum cargo mapeado ainda.</p>}</div>
    </div>}
    {tab === 'actions' && <div className="admin-workspace"><div className="admin-toolbar"><strong>Fila e histórico recente</strong><button className="refresh-button" onClick={() => setReload(value => value + 1)}>Atualizar</button></div><div className="admin-action-list">{actions.map(action => <article className="admin-action-row" key={action.id}><div><strong>{actionLabel(action.action)} · {action.nick}</strong><small>Por {action.actor} · {action.createdAt}</small></div><span className={`admin-action-status ${action.status}`}>{action.status === 'done' ? 'Concluída' : action.status === 'error' ? 'Falhou' : 'Pendente'}</span><small>{action.result || ''}</small></article>)}{actions.length === 0 && <p className="admin-empty">Nenhuma ação registrada.</p>}</div></div>}
    {tab === 'staff' && admin.role === 'owner' && <div className="admin-workspace">
      <form className="admin-role-form" onSubmit={inviteStaff}><label>Nick cadastrado no servidor<input required pattern="\.?[A-Za-z0-9_]{3,16}" value={staffForm.nick} onChange={event => setStaffForm(current => ({ ...current, nick: event.target.value }))} placeholder="Nick exato da conta" /></label><label>Papel<select value={staffForm.role} onChange={event => setStaffForm(current => ({ ...current, role: event.target.value }))}><option value="admin">Administrador</option><option value="moderator">Moderador</option><option value="helper">Ajudante</option></select></label><button className="button button-primary" type="submit" disabled={busy}>Convidar <ChevronRight size={17} /></button></form>
      <div className="admin-staff-list">{staff.map(member => <article className="admin-staff-row" key={member.nick}><div><strong>{member.nick}</strong><small>{member.configured ? 'Acesso configurado' : 'Aguardando primeiro acesso'}</small></div><select aria-label={`Papel de ${member.nick}`} value={member.role} onChange={event => changeStaffRole(member, event.target.value)}><option value="admin">Administrador</option><option value="moderator">Moderador</option><option value="helper">Ajudante</option></select><button className="admin-dismiss" onClick={() => removeStaff(member)} aria-label={`Revogar acesso de ${member.nick}`} title="Revogar acesso"><X size={16} /></button></article>)}{staff.length === 0 && <p className="admin-empty">Nenhum membro convidado.</p>}</div>
    </div>}
  </section>

  return <section className="admin-gate section-wrap">
    <div className="login-card admin-access">
      <span className="login-mark"><LockKeyhole size={24} /></span>
      <p className="section-kicker">{configured ? 'ACESSO RESTRITO' : 'CONFIGURAÇÃO INICIAL DO PROPRIETÁRIO'}</p>
      <h2>{step === 'verification' ? (setupRequired ? 'Configurar acesso.' : 'Verificar acesso.') : <>Painel <span>administrativo.</span></>}</h2>
      {step === 'credentials' ? <form onSubmit={requestToken}>
        <label>Nick do servidor<input name="nick" value={form.nick} onChange={update} required autoComplete="username" /></label>
        <label>Senha do servidor<input name="serverPassword" type="password" value={form.serverPassword} onChange={update} required autoComplete="current-password" /></label>
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Validando…' : 'Gerar código de acesso'} <ChevronRight size={17} /></button>
      </form> : <form onSubmit={authenticate}>
        <label>Código de verificação<input name="token" value={form.token} onChange={update} required inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" /></label>
        <label>Senha administrativa<input name="adminPassword" type="password" value={form.adminPassword} onChange={update} required minLength={setupRequired ? 12 : 1} autoComplete={setupRequired ? 'new-password' : 'current-password'} /></label>
        {setupRequired && <label>Confirme a senha administrativa<input name="confirmation" type="password" value={form.confirmation} onChange={update} required minLength={12} autoComplete="new-password" /></label>}
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Validando…' : setupRequired ? 'Criar acesso administrativo' : 'Entrar'} <ChevronRight size={17} /></button>
        <button className="admin-back" type="button" onClick={() => { setStep('credentials'); setError(''); setNotice('') }}>Voltar</button>
      </form>}
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {error && <p className="login-error" role="alert">{error}</p>}
    </div>
  </section>
}

function adminError(code) {
  return ({
    admin_not_configured: 'O nick administrador ainda não foi configurado na API.',
    invalid_credentials: 'Nick ou senha inválidos.',
    invalid_or_expired_token: 'Código inválido ou expirado. Gere outro código.',
    admin_already_registered: 'O acesso administrativo já foi configurado.',
    admin_not_registered: 'Configure o acesso administrativo primeiro.',
    invalid_admin_password: 'A senha precisa ter 12 caracteres e ser diferente da senha do servidor.',
    invalid_role: 'Nome ou grupo LuckPerms inválido.',
    role_exists: 'Esse nome ou grupo LuckPerms já está mapeado.',
    account_not_found: 'Conta não encontrada.',
    invalid_reason: 'Informe um motivo com até 200 caracteres.',
    invalid_duration: 'Duração inválida.',
    luckperms_unavailable: 'A lista LuckPerms ainda não está sincronizada com a Bridge.',
    luckperms_group_not_found: 'Esse grupo não existe no catálogo LuckPerms atual.',
    role_not_found: 'Cargo não encontrado.',
    invalid_staff: 'Nick ou papel de equipe inválido.',
    staff_exists: 'Esse jogador já faz parte da equipe.',
    staff_not_found: 'Membro da equipe não encontrado.',
    cannot_change_owner: 'O acesso do proprietário não pode ser alterado.',
    forbidden: 'Seu papel não permite essa ação.',
  })[code] || 'Não foi possível completar a solicitação.'
}

function staffRoleLabel(role) {
  return ({ owner: 'Proprietário', admin: 'Administrador', moderator: 'Moderador', helper: 'Ajudante' })[role] || 'Equipe'
}

function staffActions(role) {
  if (role === 'owner' || role === 'admin') return ['kick', 'ban', 'unban', 'mute', 'unmute', 'warn', 'reset_password', 'set_role']
  if (role === 'moderator') return ['kick', 'ban', 'unban', 'mute', 'unmute', 'warn']
  return ['mute', 'unmute', 'warn']
}

function actionLabel(action) {
  return ({ kick: 'Expulsar', ban: 'Banir', unban: 'Desbanir', mute: 'Silenciar', unmute: 'Remover mute', warn: 'Avisar', reset_password: 'Redefinir senha', set_role: 'Definir cargo' })[action] || action
}

export default App
