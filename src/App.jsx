import { useEffect, useState } from 'react'
import {
  ArrowUpRight, Menu, X, Copy, Check, Shield, Sparkles,
  Sword, Crown, Gem, Compass, ChevronRight, Gamepad2, LogIn, LogOut, LockKeyhole,
  MapPin, Clock3, Coins, Backpack
} from 'lucide-react'

const SERVER_IP = 'play.abyssalnexoria.com'
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
            <p className="demo-note">Endereço ilustrativo — substitua pelo IP real antes de publicar.</p>
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
      setAdmin({ nick: data.nick })
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

  if (checking) return <section className="account-gate section-wrap"><span className="login-mark"><LockKeyhole size={24} /></span><p>Verificando acesso administrativo…</p></section>

  if (admin) return <section className="admin-session section-wrap">
    <div className="admin-session-heading"><div><div className="section-kicker"><span>ABYSSAL NEXORIA · ADMINISTRAÇÃO</span></div><h1>Painel <span>administrativo.</span></h1></div><button className="refresh-button" onClick={logout}><LogOut size={15} /> Sair</button></div>
    <div className="admin-session-panel"><span className="login-mark"><Shield size={22} /></span><div><strong>{admin.nick}</strong><small>Sessão administrativa ativa</small></div><span className="admin-session-status">Autenticado</span></div>
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
  })[code] || 'Não foi possível completar a solicitação.'
}

export default App
