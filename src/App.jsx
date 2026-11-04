import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Payment, initMercadoPago } from '@mercadopago/sdk-react'
import {
  ArrowUpRight, Menu, X, Copy, Check, Shield, Sparkles, Package, ShoppingCart,
  Sword, Crown, Gem, Compass, ChevronRight, Gamepad2, LogIn, LogOut, LockKeyhole,
  MapPin, Clock3, Coins, Backpack, Plus, Minus, Trash2, Pencil, Save, RefreshCw, TrendingUp, TrendingDown
} from 'lucide-react'

const SERVER_IP = 'abyssalnexoria.blazebr.com:25710'
const ITEM_ICON_BASE = 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/items/'
const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY || ''
if (MP_PUBLIC_KEY) initMercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' })
const MP_PAYMENT_CUSTOMIZATION = { paymentMethods: { creditCard: 'all', debitCard: 'all', bankTransfer: 'all', maxInstallments: 6 } }

function isValidCpf(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!/^\d{11}$/.test(digits) || /^([0-9])\1{10}$/.test(digits)) return false
  const checkDigit = length => {
    let sum = 0
    for (let index = 0; index < length; index++) sum += Number(digits[index]) * (length + 1 - index)
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }
  return checkDigit(9) === Number(digits[9]) && checkDigit(10) === Number(digits[10])
}
// O servidor do site repassa /api/* para a API (mesma origem = cookie de sessão funciona)
const api = path => `/api${path}`
const toPlayer = d => ({ id: d.nick, nick: d.nick, syncedAt: d.updatedAt, ...(d.profile || {}), email: d.email, emailVerified: d.emailVerified, emailRequired: d.emailRequired, emailDeadline: d.emailDeadline })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const brasiliaDate = value => {
  if (!value) return null
  const raw = String(value)
  const instant = new Date(typeof value === 'number' || /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? value : `${raw.replace(' ', 'T')}Z`)
  return Number.isNaN(instant.getTime()) ? null : instant
}
const formatSiteDateTime = value => {
  const instant = brasiliaDate(value)
  return instant ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(instant) : '—'
}
const formatCountdown = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
const brasiliaDateParts = date => Object.fromEntries(new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
}).formatToParts(date).map(part => [part.type, part.value]))
const currentBrasiliaMonth = () => { const parts = brasiliaDateParts(new Date()); return `${parts.year}-${parts.month}` }
const currentBrasiliaDate = () => { const parts = brasiliaDateParts(new Date()); return `${parts.year}-${parts.month}-${parts.day}` }

function loadMe() {
  return fetch(api('/v1/site/me'), { credentials: 'include' })
    .then(response => response.ok ? response.json() : Promise.reject())
    .then(toPlayer)
    .catch(() => null)
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [player, setPlayer] = useState(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [credentials, setCredentials] = useState({ nick: '', password: '' })
  const [loginMode, setLoginMode] = useState('password')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginCode, setLoginCode] = useState('')
  const [emailCodeRequested, setEmailCodeRequested] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginNotice, setLoginNotice] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [page, setPage] = useState(window.location.hash === '#conta' ? 'account' : window.location.hash === '#admin' ? 'admin' : window.location.hash === '#loja' ? 'store' : 'home')

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
    const syncPage = () => setPage(window.location.hash === '#conta' ? 'account' : window.location.hash === '#admin' ? 'admin' : window.location.hash === '#loja' ? 'store' : 'home')
    window.addEventListener('hashchange', syncPage)
    return () => window.removeEventListener('hashchange', syncPage)
  }, [])

  useEffect(() => {
    if (page === 'store') window.scrollTo(0, 0)
  }, [page])

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

  async function login(event) {
    event.preventDefault()
    setLoggingIn(true)
    setLoginError('')
    setLoginNotice('')
    try {
      const emailLogin = loginMode === 'email'
      const requestingCode = emailLogin && !emailCodeRequested
      const endpoint = emailLogin
        ? `/v1/site/auth/email-code/${requestingCode ? 'request' : 'verify'}`
        : '/v1/site/login'
      const body = emailLogin
        ? { email: loginEmail, ...(requestingCode ? {} : { code: loginCode }) }
        : credentials
      const response = await fetch(api(endpoint), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json().catch(() => ({}))
      if (response.status === 401) throw new Error(emailLogin ? 'Código inválido ou expirado.' : 'Nick ou senha incorretos.')
      if (response.status === 429) throw new Error('Muitas tentativas. Aguarde alguns minutos.')
      if (!response.ok) throw new Error('Serviço indisponível. Tente novamente em instantes.')
      if (requestingCode) {
        setEmailCodeRequested(true)
        setLoginNotice(data.message || 'Se houver uma conta vinculada a este e-mail, enviaremos um código.')
        return
      }
      setPlayer(await loadMe())
      setLoginOpen(false)
      setCredentials({ nick: '', password: '' })
      setLoginEmail('')
      setLoginCode('')
      setEmailCodeRequested(false)
      window.location.hash = page === 'store' ? 'loja' : 'conta'
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
          <a href="#loja" onClick={() => setMenuOpen(false)}>Loja</a>
          <a href="#como-jogar" onClick={() => setMenuOpen(false)}>Como jogar</a>
          <a className="nav-cta" href="#loja" onClick={() => setMenuOpen(false)}>Explorar loja <ArrowUpRight size={16} /></a>
          <button className="account-link" onClick={openAccount}>{player ? <><Compass size={15} /> Minha conta</> : <><LogIn size={15} /> Minha conta</>}</button>
          {player && <button className="account-link account-logout" onClick={logout}><LogOut size={15} /> Sair</button>}
          <a className="admin-link" href="#admin" onClick={() => setMenuOpen(false)}><LockKeyhole size={14} /> Admin</a>
        </nav>
      </header>

      <main>{page === 'admin' ? <AdminPanel /> : page === 'store' ? <StorePage player={player} onLogin={() => setLoginOpen(true)} /> : page === 'account' ? (
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

        <section className="shop-section" id="vitrine">
          <div className="section-wrap">
            <div className="section-kicker"><span>02</span> A LOJA DO ABISMO</div>
            <div className="shop-heading">
              <div><h2>Seu próximo nível<br />começa <span>aqui.</span></h2></div>
              <p>Vantagens, itens e novidades de Nexoria reunidos em um só lugar.</p>
            </div>
            <a className="button button-primary store-visit" href="#loja"><ShoppingCart size={17} /> Abrir loja <ArrowUpRight size={16} /></a>
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
          <div className="login-method-switch" role="group" aria-label="Método de entrada">
            <button type="button" className={loginMode === 'password' ? 'active' : ''} onClick={() => { setLoginMode('password'); setLoginError(''); setLoginNotice('') }}>Nick e senha</button>
            <button type="button" className={loginMode === 'email' ? 'active' : ''} onClick={() => { setLoginMode('email'); setLoginError(''); setLoginNotice('') }}>Código por e-mail</button>
          </div>
          {loginMode === 'password' ? <>
            <p>Entre com o mesmo nick e senha do servidor. Jogadores Bedrock: use o nick com o ponto no início.</p>
            <label>Nick<input required value={credentials.nick} onChange={event => setCredentials({ ...credentials, nick: event.target.value })} autoComplete="username" placeholder="Seu nick no Minecraft" /></label>
            <label>Senha<input required type="password" value={credentials.password} onChange={event => setCredentials({ ...credentials, password: event.target.value })} autoComplete="current-password" placeholder="Sua senha" /></label>
          </> : <>
            <p>Use o e-mail confirmado na sua conta. O código vale por cinco minutos.</p>
            <label>E-mail<input required type="email" value={loginEmail} onChange={event => setLoginEmail(event.target.value)} autoComplete="email" placeholder="voce@exemplo.com" disabled={emailCodeRequested} /></label>
            {emailCodeRequested && <>
              <label>Código de seis dígitos<input required inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={loginCode} onChange={event => setLoginCode(event.target.value)} /></label>
              <button type="button" className="login-change-email" onClick={() => { setEmailCodeRequested(false); setLoginCode(''); setLoginNotice('') }}>Alterar e-mail</button>
            </>}
          </>}
          {loginNotice && <p className="login-notice" role="status">{loginNotice}</p>}
          {loginError && <p className="login-error">{loginError}</p>}
          <button className="button button-primary" disabled={loggingIn}>{loggingIn ? (emailCodeRequested ? 'Validando…' : 'Enviando…') : loginMode === 'email' && !emailCodeRequested ? 'Enviar código' : 'Entrar na conta'} <ChevronRight size={17} /></button>
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

function StorePage({ player, onLogin }) {
  const [catalog, setCatalog] = useState({ categories: [], products: [] })
  const [category, setCategory] = useState('all')
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nexoria-store-cart') || '{}') } catch { return {} }
  })
  const [loading, setLoading] = useState(true)
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [paymentResult, setPaymentResult] = useState(null)
  const [pendingOrderId, setPendingOrderId] = useState('')
  const [error, setError] = useState('')
  const [payerCpf, setPayerCpf] = useState('')
  const payerCpfRef = useRef('')
  const [verificationBusy, setVerificationBusy] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState('')
  const verificationBusyRef = useRef(false)
  const [siteNow, setSiteNow] = useState(Date.now())

  useEffect(() => {
    let active = true
    fetch(api('/v1/site/store/catalog')).then(response => response.ok ? response.json() : Promise.reject())
      .then(data => { if (active) setCatalog(data) })
      .catch(() => { if (active) setError('Não foi possível carregar a loja.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    localStorage.setItem('nexoria-store-cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    if (!paymentResult?.expiresAt || !['pending', 'in_process'].includes(paymentResult.status)) return
    const timer = window.setInterval(() => {
      const currentTime = Date.now()
      setSiteNow(currentTime)
      if (currentTime >= Number(paymentResult.expiresAt)) setPendingOrderId('')
    }, 1000)
    return () => window.clearInterval(timer)
  }, [paymentResult?.expiresAt, paymentResult?.status])

  const visibleProducts = catalog.products.filter(product => category === 'all' || product.categoryId === category)
  const cartItems = useMemo(() => catalog.products.filter(product => Number(cart[product.id]) > 0), [catalog.products, cart])
  const total = useMemo(() => cartItems.reduce((sum, product) => sum + product.priceCents * Number(cart[product.id]), 0), [cartItems, cart])
  const paymentInitialization = useMemo(() => ({ amount: total / 100 }), [total])
  const money = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const refreshPaymentStatus = useCallback(async (manual = false) => {
    if (!pendingOrderId || verificationBusyRef.current) return
    verificationBusyRef.current = true
    setVerificationBusy(true)
    if (manual) setVerificationMessage('')
    try {
      const response = await fetch(api(`/v1/site/store/orders/${encodeURIComponent(pendingOrderId)}/verify`), {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}',
      })
      const order = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(order.error || 'payment_status_unavailable')
      if (order.status === 'paid') {
        setPaymentResult(current => ({ ...current, status: 'approved' }))
        setCart({})
        setPendingOrderId('')
        setVerificationMessage('')
      } else if (order.status === 'failed') {
        setPaymentResult(current => ({ ...current, status: 'failed' }))
        setPendingOrderId('')
        setVerificationMessage('')
      } else if (manual) {
        setVerificationMessage('Ainda não recebemos a confirmação. Se já pagou, aguarde um pouco e consulte novamente.')
      }
    } catch {
      if (manual) setVerificationMessage('Não foi possível consultar agora. Tente novamente em instantes.')
    } finally {
      verificationBusyRef.current = false
      setVerificationBusy(false)
    }
  }, [pendingOrderId])

  useEffect(() => {
    if (!pendingOrderId) return
    refreshPaymentStatus()
    const timer = window.setInterval(() => refreshPaymentStatus(), 15000)
    return () => window.clearInterval(timer)
  }, [pendingOrderId, refreshPaymentStatus])

  function changeQuantity(id, amount) {
    setCart(current => {
      const next = { ...current }
      const quantity = Math.min(99, Math.max(0, Number(next[id] || 0) + amount))
      if (quantity) next[id] = quantity
      else delete next[id]
      return next
    })
  }

  function checkout() {
    if (!player) return onLogin()
    setCheckoutOpen(true)
    setError('')
  }

  const submitPayment = useCallback(async ({ formData, paymentType }) => {
    setCheckoutBusy(true)
    setError('')
    try {
      let payment = { ...formData, checkout_payment_type: paymentType }
      if (formData.payment_method_id === 'pix') {
        const cpf = payerCpfRef.current
        if (!isValidCpf(cpf)) throw new Error('Informe um CPF válido do titular para pagar com Pix.')
        payment = { ...payment, payer: { ...formData.payer, identification: { type: 'CPF', number: cpf } } }
      }
      const response = await fetch(api('/v1/site/store/payments'), {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map(product => ({ id: product.id, quantity: Number(cart[product.id]) })),
          payment,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const messages = {
          payments_not_configured: 'O pagamento ainda não está configurado pela administração.',
          invalid_cart: 'O carrinho está inválido. Atualize a loja e tente novamente.',
          invalid_total: 'O total da compra está inválido. Revise o carrinho.',
          products_unavailable: 'Algum produto mudou. Atualize a loja e revise o carrinho.',
          invalid_payment_data: 'Confira os dados do pagador e tente novamente.',
          pix_identification_required: 'Para pagar com Pix, informe CPF ou CNPJ nos dados solicitados pelo Mercado Pago.',
          pix_cpf_invalid: 'Informe um CPF válido do titular para pagar com Pix.',
          payment_rejected: 'O pagamento não foi autorizado. Confira os dados ou escolha outro método.',
          payment_verification_failed: 'Não foi possível confirmar o valor do pagamento. Entre em contato com o suporte.',
          checkout_unavailable: 'O Mercado Pago está indisponível. Tente novamente.',
        }
        const message = messages[data.error]
          || `A API de pagamento respondeu com erro HTTP ${response.status}. Confirme se a versão atualizada da API foi publicada.`
        const detail = data.statusDetail || data.causeCodes?.join(', ')
        throw new Error(detail ? `${message} (Mercado Pago: ${detail})` : message)
      }
      if (['rejected', 'cancelled'].includes(data.status))
        throw new Error('O pagamento não foi autorizado. Confira os dados ou escolha outro método.')
      setPaymentResult(data)
      if (data.status === 'approved') setCart({})
      else if (data.status === 'pending' || data.status === 'in_process') setPendingOrderId(data.orderId)
      else throw new Error('O Mercado Pago retornou um status de pagamento inesperado.')
      return data
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível iniciar o pagamento.')
      throw requestError
    } finally {
      setCheckoutBusy(false)
    }
  }, [cartItems, cart])

  const handlePaymentError = useCallback(() => {
    setError('Não foi possível carregar o formulário de pagamento. Atualize a página e tente novamente.')
  }, [])

  return <section className="store-page section-wrap" id="loja">
    <div className="store-heading">
      <div><div className="section-kicker"><span>ABYSSAL NEXORIA · LOJA OFICIAL</span></div><h1>Escolha sua <span>vantagem.</span></h1><p>Benefícios e produtos para sua próxima jornada.</p></div>
      <div className="store-player">{player ? <><Shield size={16} /><span>Comprando para <strong>{player.nick}</strong></span></> : <button className="refresh-button" onClick={onLogin}><LogIn size={15} /> Entrar para comprar</button>}</div>
    </div>
    <div className="store-layout">
      <div className="store-catalog">
        <nav className="store-categories" aria-label="Categorias da loja">
          <button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>Todos</button>
          {catalog.categories.map(item => <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)}>{item.name}</button>)}
        </nav>
        {loading ? <p className="store-status">Carregando produtos…</p> : visibleProducts.length ? <div className="store-products">
          {visibleProducts.map(product => <article className="store-product" key={product.id}>
            <div className="store-product-art">{product.kind === 'vip' ? <Crown size={24} /> : <Package size={24} />}</div>
            <span className="store-product-category">{product.category}</span>
            <h2>{product.name}</h2>
            <p>{product.description || 'Um novo benefício para sua jornada.'}</p>
            {product.kind === 'vip' && <small className="store-product-duration">{product.durationDays ? `${product.durationDays} dias` : 'Permanente'}</small>}
            <div className="store-product-bottom"><strong>{money(product.priceCents)}</strong><button className="store-add" onClick={() => changeQuantity(product.id, 1)} aria-label={`Adicionar ${product.name} ao carrinho`} title="Adicionar ao carrinho"><Plus size={17} /></button></div>
          </article>)}
        </div> : <div className="store-empty"><ShoppingCart size={25} /><h2>{loading ? 'Carregando…' : 'A loja está sendo preparada.'}</h2><p>{loading ? '' : 'Novos produtos estarão disponíveis em breve.'}</p></div>}
      </div>
      <aside className="store-cart" aria-label="Carrinho">
        <div className="store-cart-heading"><h2><ShoppingCart size={18} /> Carrinho</h2><span>{cartItems.reduce((count, item) => count + Number(cart[item.id]), 0)}</span></div>
        {cartItems.length ? <div className="store-cart-items">{cartItems.map(item => <article className="store-cart-item" key={item.id}>
          <div className="store-cart-item-title"><strong>{item.name}</strong><small>{money(item.priceCents)} cada</small></div>
          <div className="store-quantity"><button onClick={() => changeQuantity(item.id, -1)} aria-label={`Diminuir ${item.name}`}><Minus size={13} /></button><span>{cart[item.id]}</span><button onClick={() => changeQuantity(item.id, 1)} aria-label={`Aumentar ${item.name}`}><Plus size={13} /></button><button className="store-remove" onClick={() => setCart(current => { const next = { ...current }; delete next[item.id]; return next })} aria-label={`Remover ${item.name}`}><Trash2 size={14} /></button></div>
        </article>)}</div> : <p className="store-cart-empty">Seu carrinho está vazio.</p>}
        <div className="store-cart-total"><span>Total</span><strong>{money(total)}</strong></div>
        {error && <p className="login-error" role="alert">{error}</p>}
        {!checkoutOpen && <button className="button button-primary store-checkout" disabled={!cartItems.length || checkoutBusy} onClick={checkout}>{player ? 'Continuar para pagamento' : 'Entrar para continuar'} <ChevronRight size={17} /></button>}
        <small className="store-payment-note">Pagamento processado com segurança pelo Mercado Pago.</small>
        {checkoutOpen && <section className="store-payment-form" aria-label="Pagamento transparente">
          <div className="store-payment-heading"><strong>Pagamento</strong><button className="admin-dismiss" onClick={() => { setCheckoutOpen(false); setPaymentResult(null); setError('') }} aria-label="Fechar pagamento"><X size={15} /></button></div>
          {paymentResult?.status === 'approved' ? <div className="store-payment-state success"><Check size={19} /><div><strong>Pagamento aprovado</strong><small>Seu pedido foi confirmado.</small></div></div> : paymentResult?.expiresAt && Number(paymentResult.expiresAt) <= siteNow ? <div className="store-payment-state failed"><Clock3 size={19} /><div><strong>QR Code Pix expirado</strong><small>Este código não aceita mais pagamentos. Gere um novo para continuar.</small></div><button className="button button-primary store-new-pix" onClick={() => { setPaymentResult(null); setPendingOrderId(''); setVerificationMessage('') }}>Gerar novo QR Code <RefreshCw size={15} /></button></div> : paymentResult?.status === 'pending' || paymentResult?.status === 'in_process' ? <div className="store-payment-state"><Clock3 size={19} /><div><strong>Aguardando confirmação</strong><small>{paymentResult.pixQrCode ? `Pague com o Pix para concluir o pedido. Expira em ${formatCountdown(Math.max(0, Math.ceil((Number(paymentResult.expiresAt) - siteNow) / 1000)))}` : 'Estamos aguardando a confirmação do Mercado Pago.'}</small></div>
            {paymentResult.pixQrCodeBase64 && <img className="store-pix-qr" src={`data:image/png;base64,${paymentResult.pixQrCodeBase64}`} alt="QR Code Pix para pagamento" />}
            {paymentResult.pixQrCode && <label className="store-pix-code">Código Pix<input readOnly value={paymentResult.pixQrCode} onFocus={event => event.target.select()} /></label>}
            {verificationMessage && <small className="store-payment-verification-message" role="status">{verificationMessage}</small>}
            <button className="button button-ghost store-payment-verify" onClick={() => refreshPaymentStatus(true)} disabled={verificationBusy}><RefreshCw size={15} />{verificationBusy ? 'Consultando…' : 'Já paguei'}</button>
            {paymentResult.ticketUrl && <a className="button button-ghost" href={paymentResult.ticketUrl} target="_blank" rel="noreferrer">Abrir boleto</a>}
          </div> : paymentResult?.status === 'failed' ? <div className="store-payment-state failed"><X size={19} /><div><strong>Pagamento não concluído</strong><small>Tente iniciar outro pagamento.</small></div></div> : MP_PUBLIC_KEY ? <>
            <p className="store-payment-hint">Informe os dados solicitados pelo Mercado Pago.</p>
            <label className="store-payer-cpf">CPF do titular (obrigatório para Pix)<input inputMode="numeric" autoComplete="off" maxLength={11} placeholder="11 números" value={payerCpf} onChange={event => { const value = event.target.value.replace(/\D/g, '').slice(0, 11); payerCpfRef.current = value; setPayerCpf(value) }} /></label>
            <Payment
              initialization={paymentInitialization}
              customization={MP_PAYMENT_CUSTOMIZATION}
              onSubmit={submitPayment}
              onError={handlePaymentError}
              locale="pt-BR"
            />
          </> : <p className="login-error">Configure `VITE_MP_PUBLIC_KEY` no ambiente de build do site para carregar o formulário.</p>}
        </section>}
      </aside>
    </div>
  </section>
}

function PlayerPanel({ player, onRefresh }) {
  const [busy, setBusy] = useState(false)
  const [emailAddress, setEmailAddress] = useState(player.email || '')
  const [emailToken, setEmailToken] = useState('')
  const [emailCodeSent, setEmailCodeSent] = useState(false)
  const [emailVerified, setEmailVerified] = useState(Boolean(player.emailVerified))
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailNotice, setEmailNotice] = useState('')
  const date = value => value ? formatSiteDateTime(value) : 'Sem dados'
  const num = value => Number.isFinite(value) ? value.toLocaleString('pt-BR') : null
  const loc = player.lastLocation
  const synced = !!(player.lastSeenAt || player.lastLoginAt)
  const list = value => Array.isArray(value) ? value : []
  async function refresh() { setBusy(true); try { await onRefresh() } finally { setBusy(false) } }
  async function requestEmailCode(event) {
    event.preventDefault()
    setEmailBusy(true)
    setEmailError('')
    setEmailNotice('')
    try {
      const response = await fetch(api('/v1/site/auth/email-code/link/request'), {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAddress }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const messages = {
          invalid_email: 'Informe um endereço de e-mail válido.',
          email_already_verified: 'Esse e-mail já está confirmado.',
          email_in_use: 'Esse e-mail já pertence a outra conta.',
          email_code_cooldown: 'Aguarde um minuto antes de pedir outro código.',
          too_many_requests: 'Muitas solicitações. Aguarde antes de tentar novamente.',
          email_unavailable: 'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.',
        }
        throw new Error(messages[data.error] || 'Não foi possível solicitar o código.')
      }
      setEmailCodeSent(true)
      setEmailNotice(data.message || 'Código enviado. Confira sua caixa de entrada.')
    } catch (error) {
      setEmailError(error.message || 'Não foi possível solicitar o código.')
    } finally { setEmailBusy(false) }
  }
  async function verifyEmailCode(event) {
    event.preventDefault()
    setEmailBusy(true)
    setEmailError('')
    setEmailNotice('')
    try {
      const response = await fetch(api('/v1/site/auth/email-code/link/verify'), {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAddress, code: emailToken }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(response.status === 401 ? 'Código inválido ou expirado.' : 'Não foi possível confirmar o e-mail.')
      setEmailVerified(true)
      setEmailAddress(data.email)
      setEmailCodeSent(false)
      setEmailToken('')
      setEmailNotice('E-mail confirmado com sucesso.')
    } catch (error) {
      setEmailError(error.message || 'Não foi possível confirmar o e-mail.')
    } finally { setEmailBusy(false) }
  }
  return <section className="account-area section-wrap" id="conta">
    <div className="account-heading"><div><div className="section-kicker"><span>SEU PERFIL · SINCRONIZADO PELO SERVIDOR</span></div><h2>Olá, <span>{player.nick}</span>.</h2></div>
      <div className="profile-badges"><span className={player.online ? 'online-badge' : 'offline-badge'}><i />{player.online ? 'Online no servidor' : 'Offline'}</span><span className="vip-badge"><Crown size={15} /> {player.vip || 'Sem VIP'}</span><button className="refresh-button" onClick={refresh} disabled={busy}>{busy ? 'Pedindo dados ao servidor…' : 'Atualizar agora'}</button></div></div>
    {!synced && <p className="management-notice">Ainda não há dados deste jogador. Entre no servidor e faça login no jogo: o perfil é enviado automaticamente.</p>}
    <div className="account-grid">
      <article className="account-security-card">
        <div className="account-security-copy"><Shield /><div><strong>E-mail de segurança</strong><p>{emailVerified ? `${emailAddress} · confirmado` : player.emailRequired ? `Obrigatório até ${date(player.emailDeadline)}.` : 'Opcional. Confirme um e-mail para entrar também com código.'}</p></div></div>
        {!emailVerified && <form onSubmit={emailCodeSent ? verifyEmailCode : requestEmailCode}>
          <label>E-mail<input type="email" required maxLength={254} autoComplete="email" disabled={emailCodeSent || emailBusy} value={emailAddress} onChange={event => setEmailAddress(event.target.value)} placeholder="voce@exemplo.com" /></label>
          {emailCodeSent && <label>Código<input required inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={emailToken} onChange={event => setEmailToken(event.target.value)} /></label>}
          {emailError && <p className="login-error" role="alert">{emailError}</p>}
          {emailNotice && <p className="login-notice" role="status">{emailNotice}</p>}
          <div className="account-security-actions"><button className="button button-primary" disabled={emailBusy}>{emailBusy ? 'Aguarde…' : emailCodeSent ? 'Confirmar e-mail' : 'Enviar código'} <ChevronRight size={16} /></button>{emailCodeSent && <button type="button" className="admin-back" onClick={() => { setEmailCodeSent(false); setEmailToken(''); setEmailNotice('') }}>Alterar e-mail</button>}</div>
        </form>}
        {emailVerified && emailNotice && <p className="login-notice" role="status">{emailNotice}</p>}
      </article>
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
  const [transactionAccess, setTransactionAccess] = useState({ canView: false, roles: [] })
  const [accounts, setAccounts] = useState([])
  const [roles, setRoles] = useState([])
  const [luckPermsCatalog, setLuckPermsCatalog] = useState({ available: false, syncedAt: null, groups: [] })
  const [actions, setActions] = useState([])
  const [staff, setStaff] = useState([])
  const [emailPolicy, setEmailPolicy] = useState({ required: false, deadlineHours: 72 })
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
      admin.role === 'owner' ? fetch(api('/v1/site/admin/security/email-policy'), { credentials: 'include' }).then(response => response.ok ? response.json() : Promise.reject()) : Promise.resolve(null),
    ]).then(([accountData, roleData, groupsData, actionData, staffData, emailPolicyData]) => {
      if (!active) return
      setAccounts(accountData.accounts)
      setRoles(roleData.roles)
      setLuckPermsCatalog(groupsData)
      setActions(actionData.actions)
      if (staffData) setStaff(staffData.staff)
      if (emailPolicyData) setEmailPolicy(emailPolicyData)
    }).catch(() => { if (active) setError('Não foi possível carregar os dados administrativos.') })
    return () => { active = false }
  }, [admin, search, reload])

  useEffect(() => {
    if (!admin) return
    let active = true
    fetch(api('/v1/site/admin/store/transactions/access'), { credentials: 'include' })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => { if (active) setTransactionAccess(data) })
      .catch(() => { if (active) setTransactionAccess({ canView: admin.role === 'owner', roles: [] }) })
    return () => { active = false }
  }, [admin])

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
      setNotice(`Código enviado para ${data.emailHint}.`)
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

  async function saveEmailPolicy(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(api('/v1/site/admin/security/email-policy'), {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPolicy),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(adminError(data.error))
      setEmailPolicy({ required: data.required, deadlineHours: data.deadlineHours })
      setNotice('Política de e-mail atualizada.')
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível salvar a política.')
    } finally { setBusy(false) }
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
      {[['accounts', 'Contas'], ['actions', 'Atividades'], ...(transactionAccess.canView ? [['transactions', 'Transações'], ['finance', 'Financeiro']] : []), ...(['owner', 'admin'].includes(admin.role) ? [['store', 'Loja']] : []), ...(admin.role === 'owner' ? [['roles', 'Cargos'], ['staff', 'Equipe'], ['security', 'Segurança']] : [])].map(([key, label]) => <button key={key} className={tab === key ? 'admin-tab active' : 'admin-tab'} onClick={() => setTab(key)}>{label}</button>)}
    </nav>
    {error && <p className="login-error" role="alert">{error}</p>}
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    {temporaryPassword && <div className="admin-temporary-password"><code>{temporaryPassword}</code><button className="refresh-button" onClick={copyTemporaryPassword}><Copy size={14} /> Copiar</button><button className="admin-dismiss" onClick={() => setTemporaryPassword('')} aria-label="Ocultar senha"><X size={15} /></button></div>}
    {tab === 'transactions' && transactionAccess.canView && <StoreTransactions admin={admin} access={transactionAccess} onAccessChange={setTransactionAccess} />}
    {tab === 'finance' && transactionAccess.canView && <StoreFinance />}
    {tab === 'store' && ['owner', 'admin'].includes(admin.role) && <StoreEditor />}
    {tab === 'accounts' && <div className="admin-workspace">
      <div className="admin-toolbar"><label>Buscar conta<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nick do servidor" /></label><button className="refresh-button" onClick={() => setReload(value => value + 1)}>Atualizar</button></div>
      <div className="admin-account-list">{accounts.map(account => <article className="admin-account-row" key={account.id}>
        <div><strong>{account.nick}</strong><small>{account.profile?.online ? 'Online' : 'Offline'} · {account.profile?.level != null ? `Nível ${account.profile.level}` : 'Sem perfil sincronizado'}</small></div>
        <div><small>{account.uuid || 'UUID pendente'}</small><small>{account.updatedAt ? `Sincronizado ${formatSiteDateTime(account.updatedAt)}` : 'Nunca sincronizado'}</small></div>
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
    {tab === 'actions' && <div className="admin-workspace"><div className="admin-toolbar"><strong>Fila e histórico recente</strong><button className="refresh-button" onClick={() => setReload(value => value + 1)}>Atualizar</button></div><div className="admin-action-list">{actions.map(action => <article className="admin-action-row" key={action.id}><div><strong>{actionLabel(action.action)} · {action.nick}</strong><small>Por {action.actor} · {formatSiteDateTime(action.createdAt)}</small></div><span className={`admin-action-status ${action.status}`}>{action.status === 'done' ? 'Concluída' : action.status === 'error' ? 'Falhou' : 'Pendente'}</span><small>{action.result || ''}</small></article>)}{actions.length === 0 && <p className="admin-empty">Nenhuma ação registrada.</p>}</div></div>}
    {tab === 'staff' && admin.role === 'owner' && <div className="admin-workspace">
      <form className="admin-role-form" onSubmit={inviteStaff}><label>Nick cadastrado no servidor<input required pattern="\.?[A-Za-z0-9_]{3,16}" value={staffForm.nick} onChange={event => setStaffForm(current => ({ ...current, nick: event.target.value }))} placeholder="Nick exato da conta" /></label><label>Papel<select value={staffForm.role} onChange={event => setStaffForm(current => ({ ...current, role: event.target.value }))}><option value="admin">Administrador</option><option value="moderator">Moderador</option><option value="helper">Ajudante</option></select></label><button className="button button-primary" type="submit" disabled={busy}>Convidar <ChevronRight size={17} /></button></form>
      <div className="admin-staff-list">{staff.map(member => <article className="admin-staff-row" key={member.nick}><div><strong>{member.nick}</strong><small>{member.emailVerified ? 'E-mail confirmado' : 'E-mail pendente · prazo de 72h'} · {member.configured ? 'Acesso configurado' : 'Aguardando primeiro acesso'}</small></div><select aria-label={`Papel de ${member.nick}`} value={member.role} onChange={event => changeStaffRole(member, event.target.value)}><option value="admin">Administrador</option><option value="moderator">Moderador</option><option value="helper">Ajudante</option></select><button className="admin-dismiss" onClick={() => removeStaff(member)} aria-label={`Revogar acesso de ${member.nick}`} title="Revogar acesso"><X size={16} /></button></article>)}{staff.length === 0 && <p className="admin-empty">Nenhum membro convidado.</p>}</div>
    </div>}
    {tab === 'security' && admin.role === 'owner' && <div className="admin-workspace">
      <form className="admin-email-policy" onSubmit={saveEmailPolicy}>
        <label className="admin-email-policy-toggle"><input type="checkbox" checked={emailPolicy.required} onChange={event => setEmailPolicy(current => ({ ...current, required: event.target.checked }))} /><span><strong>Exigir e-mail confirmado de todos os usuários</strong><small>Usuários comuns podem manter o e-mail opcional quando esta opção estiver desativada. Equipe administrativa continua obrigada.</small></span></label>
        <label>Prazo para cadastro (horas)<input type="number" min="1" max="720" required value={emailPolicy.deadlineHours} onChange={event => setEmailPolicy(current => ({ ...current, deadlineHours: Number(event.target.value) }))} /></label>
        <p>O prazo começa na ativação da política para contas existentes e na criação da conta para novos usuários. Cargos administrativos têm prazo próprio de 72 horas.</p>
        <button className="button button-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar política'} <Save size={15} /></button>
      </form>
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

function StoreTransactions({ admin, access, onAccessChange }) {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  const [siteNow, setSiteNow] = useState(Date.now())
  const hasExpiringOrders = orders.some(order => order.status === 'pending' && Number(order.expiresAt) > 0)

  useEffect(() => {
    if (!hasExpiringOrders) return
    const timer = window.setInterval(() => setSiteNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [hasExpiringOrders])

  useEffect(() => {
    if (!hasExpiringOrders) return
    let active = true
    const refresh = async () => {
      const response = await fetch(api(`/v1/site/admin/store/transactions?status=${filter}`), { credentials: 'include' }).catch(() => null)
      if (!response?.ok) return
      const data = await response.json().catch(() => null)
      if (active && data?.orders) setOrders(data.orders)
    }
    const timer = window.setInterval(refresh, 15000)
    return () => { active = false; window.clearInterval(timer) }
  }, [hasExpiringOrders, filter])
  const isOwner = admin.role === 'owner'

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch(api(`/v1/site/admin/store/transactions?status=${filter}`), { credentials: 'include' })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => { if (active) setOrders(data.orders) })
      .catch(() => { if (active) setError('Não foi possível carregar as transações.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filter, revision])

  const money = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const date = value => formatSiteDateTime(value)
  const statusLabel = status => ({ pending: 'Iniciada · pendente', paid: 'Finalizada · paga', failed: 'Não concluída' })[status] || status
  const deliveryLabel = status => ({ delivered: 'Entregue', partial: 'Parcial', pending: 'Aguardando entrega', not_paid: 'Não paga', failed: 'Falha na entrega' })[status] || status
  const paymentLabel = order => {
    const method = order.paymentMethodId?.toLowerCase()
    if (method === 'pix') return 'Pix'
    if (method) return `${order.paymentType || 'Cartão'} · ${order.paymentMethodId}`
    return 'Não informado'
  }

  async function saveAccess(role, canView) {
    const roles = access.roles.filter(item => item.canView).map(item => item.role)
    const nextRoles = canView ? [...new Set([...roles, role])] : roles.filter(item => item !== role)
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(api('/v1/site/admin/store/transactions/access'), {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: nextRoles }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error('Não foi possível atualizar as permissões.')
      const updated = { canView: true, roles: data.roles }
      onAccessChange(updated)
      setNotice('Permissões das transações atualizadas.')
    } catch (requestError) { setError(requestError.message) } finally { setBusy(false) }
  }

  async function clearTransactions() {
    const confirmed = window.confirm('Remover do histórico todas as transações pagas e não concluídas? Pedidos Pix ainda pendentes serão preservados, assim como a fila de entrega dos produtos.')
    if (!confirmed) return
    setClearing(true); setError(''); setNotice('')
    try {
      const response = await fetch(api('/v1/site/admin/store/transactions'), { method: 'DELETE', credentials: 'include' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error('Não foi possível limpar as transações.')
      setNotice(`${data.deleted} transações removidas. ${data.pendingPreserved} pedidos pendentes foram preservados.`)
      setRevision(value => value + 1)
    } catch (requestError) { setError(requestError.message) } finally { setClearing(false) }
  }

  return <div className="admin-workspace transaction-workspace">
    {isOwner && <section className="transaction-access"><div><strong>Acesso às transações</strong><small>Escolha quais papéis administrativos podem consultar dados de compras.</small></div>
      <div className="transaction-access-options">{access.roles.map(item => <label key={item.role}><input type="checkbox" checked={item.canView} disabled={busy} onChange={event => saveAccess(item.role, event.target.checked)} />{staffRoleLabel(item.role)}</label>)}</div>
    </section>}
    <div className="transaction-toolbar"><label>Status<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Todas</option><option value="pending">Iniciadas / pendentes</option><option value="paid">Finalizadas / pagas</option><option value="failed">Não concluídas</option></select></label><div className="transaction-toolbar-actions"><button className="refresh-button" onClick={() => setRevision(value => value + 1)}><RefreshCw size={14} /> Atualizar</button>{isOwner && <button className="transaction-clear-button" onClick={clearTransactions} disabled={clearing}><Trash2 size={14} />{clearing ? 'Limpando…' : 'Limpar transações'}</button>}</div></div>
    {error && <p className="login-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
    {loading ? <p className="store-status">Carregando transações…</p> : orders.length ? <div className="transaction-table-wrap"><table className="transaction-table"><thead><tr><th>Pedido / jogador</th><th>Data e hora</th><th>Valor</th><th>Pagamento</th><th>Status</th><th>Entrega</th><th>Produtos</th></tr></thead><tbody>{orders.map(order => <tr key={order.id}>
      <td><strong>{order.player}</strong><small title={order.id}>{order.id.slice(0, 8)}</small></td>
      <td><span>{date(order.createdAt)}</span><small>Atualizado {date(order.updatedAt)}</small></td>
      <td><strong>{money(order.amountCents)}</strong></td>
      <td><span>{paymentLabel(order)}</span><small>{order.paymentId ? `ID ${order.paymentId}` : 'Sem ID de pagamento'}</small></td>
      <td><span className={`transaction-status ${order.status}`}>{statusLabel(order.status)}</span>{order.status === 'pending' && Number(order.expiresAt) > 0 && <small className={`transaction-expiry ${Number(order.expiresAt) <= siteNow ? 'expired' : ''}`}>{Number(order.expiresAt) <= siteNow ? 'Expirado; removendo…' : `QR expira em ${formatCountdown(Math.ceil((Number(order.expiresAt) - siteNow) / 1000))}`}</small>}</td>
      <td><span className={`transaction-delivery ${order.deliveryStatus}`}>{deliveryLabel(order.deliveryStatus)}</span></td>
      <td>{order.items.map(item => <div className="transaction-item" key={`${order.id}-${item.productId}`}><span>{item.name} × {item.quantity}</span><small>{deliveryLabel(item.deliveryStatus)} · {money(item.priceCents * item.quantity)}</small></div>)}</td>
    </tr>)}</tbody></table></div> : <p className="admin-empty">Nenhuma transação neste filtro.</p>}
  </div>
}

function StoreFinance() {
  const [month, setMonth] = useState(currentBrasiliaMonth)
  const [report, setReport] = useState({ summary: null, sales: [], expenses: [] })
  const [expenseForm, setExpenseForm] = useState({ expenseDate: currentBrasiliaDate(), category: '', description: '', amount: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch(api(`/v1/site/admin/store/finance?month=${encodeURIComponent(month)}`), { credentials: 'include' })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => { if (active) setReport(data) })
      .catch(() => { if (active) setError('Não foi possível carregar o fechamento mensal.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [month, revision])

  const money = cents => (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const expenseDateLabel = value => {
    const instant = brasiliaDate(`${value}T12:00:00-03:00`)
    return instant ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'America/Sao_Paulo' }).format(instant) : '—'
  }

  async function saveExpense(event) {
    event.preventDefault()
    const amountCents = Math.round(Number(expenseForm.amount.replace(',', '.')) * 100)
    if (!Number.isSafeInteger(amountCents) || amountCents < 1) return setError('Informe um valor válido para a despesa.')
    setSaving(true); setError(''); setNotice('')
    try {
      const response = await fetch(api('/v1/site/admin/store/finance/expenses'), {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expenseForm, amountCents }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error === 'invalid_expense' ? 'Confira data, categoria, descrição e valor da despesa.' : 'Não foi possível registrar a despesa.')
      setExpenseForm(current => ({ ...current, category: '', description: '', amount: '' }))
      setNotice('Despesa registrada no caixa do mês.')
      setRevision(value => value + 1)
    } catch (requestError) { setError(requestError.message) } finally { setSaving(false) }
  }

  async function removeExpense(expense) {
    if (!window.confirm(`Excluir a despesa “${expense.description}” de ${money(expense.amountCents)}?`)) return
    setDeletingId(expense.id); setError(''); setNotice('')
    try {
      const response = await fetch(api(`/v1/site/admin/store/finance/expenses/${expense.id}`), { method: 'DELETE', credentials: 'include' })
      if (!response.ok) throw new Error('Não foi possível excluir a despesa.')
      setNotice('Despesa excluída e registrada na auditoria.')
      setRevision(value => value + 1)
    } catch (requestError) { setError(requestError.message) } finally { setDeletingId(null) }
  }

  const summary = report.summary || { incomeCents: 0, expenseCents: 0, balanceCents: 0, salesCount: 0, expenseCount: 0 }
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date(`${month}-15T12:00:00-03:00`))

  return <div className="admin-workspace finance-workspace">
    <div className="finance-toolbar"><div><strong>Caixa do servidor</strong><small>Fechamento mensal de entradas e saídas.</small></div><label>Mês de referência<input type="month" value={month} onChange={event => setMonth(event.target.value)} /></label></div>
    {error && <p className="login-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
    <div className="finance-summary" aria-label={`Resumo financeiro de ${monthLabel}`}>
      <article><span>Entradas de vendas</span><strong>{money(summary.incomeCents)}</strong><small>{summary.salesCount} pedidos pagos</small></article>
      <article><span>Despesas do servidor</span><strong>{money(summary.expenseCents)}</strong><small>{summary.expenseCount} lançamentos</small></article>
      <article className={summary.balanceCents < 0 ? 'negative' : 'positive'}><span>{summary.balanceCents < 0 ? 'Faltou no caixa' : 'Saldo do mês'}</span><strong>{money(Math.abs(summary.balanceCents))}</strong><small>{summary.balanceCents < 0 ? 'Saídas acima das entradas' : 'Entradas menos despesas'}</small></article>
    </div>
    <section className="finance-section"><div className="finance-section-heading"><div><h2>Registrar despesa</h2><p>Competência considerada pelo calendário de Brasília.</p></div></div>
      <form className="finance-expense-form" onSubmit={saveExpense}>
        <label>Data<input type="date" required value={expenseForm.expenseDate} onChange={event => setExpenseForm(current => ({ ...current, expenseDate: event.target.value }))} /></label>
        <label>Categoria<input required minLength={2} maxLength={40} value={expenseForm.category} onChange={event => setExpenseForm(current => ({ ...current, category: event.target.value }))} placeholder="Hospedagem, domínio…" /></label>
        <label>Descrição<input required minLength={2} maxLength={180} value={expenseForm.description} onChange={event => setExpenseForm(current => ({ ...current, description: event.target.value }))} placeholder="Ex.: mensalidade do servidor" /></label>
        <label>Valor (R$)<input required type="number" min="0.01" max="10000000" step="0.01" value={expenseForm.amount} onChange={event => setExpenseForm(current => ({ ...current, amount: event.target.value }))} /></label>
        <button className="button button-primary" disabled={saving}>{saving ? 'Registrando…' : 'Adicionar despesa'} <Plus size={16} /></button>
      </form>
    </section>
    <div className="finance-ledgers">
      <section className="finance-section"><div className="finance-section-heading"><div><h2>Vendas pagas</h2><p>{monthLabel}</p></div></div>
        {loading ? <p className="store-status">Carregando fechamento…</p> : report.sales.length ? <div className="finance-entry-list">{report.sales.map(sale => <article key={sale.id}><div><strong>{sale.player}</strong><small>{formatSiteDateTime(sale.paidAt)} · {sale.paymentMethodId === 'pix' ? 'Pix' : sale.paymentMethodId || 'Meio não informado'}</small></div><strong>{money(sale.amountCents)}</strong></article>)}</div> : <p className="admin-empty">Nenhuma venda paga neste mês.</p>}
      </section>
      <section className="finance-section"><div className="finance-section-heading"><div><h2>Despesas registradas</h2><p>{monthLabel}</p></div></div>
        {loading ? <p className="store-status">Carregando fechamento…</p> : report.expenses.length ? <div className="finance-entry-list">{report.expenses.map(expense => <article key={expense.id}><div><strong>{expense.description}</strong><small>{expense.category} · {expenseDateLabel(expense.expenseDate)} · Por {expense.createdBy}</small></div><strong>{money(expense.amountCents)}</strong><button className="finance-expense-delete" onClick={() => removeExpense(expense)} disabled={deletingId === expense.id} aria-label={`Excluir despesa ${expense.description}`} title="Excluir despesa"><Trash2 size={15} /></button></article>)}</div> : <p className="admin-empty">Nenhuma despesa neste mês.</p>}
      </section>
    </div>
  </div>
}

function StoreEditor() {
  const [catalog, setCatalog] = useState({ categories: [], products: [] })
  const [editorMode, setEditorMode] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [categoryForm, setCategoryForm] = useState({ id: null, name: '' })
  const [productForm, setProductForm] = useState({ name: '', description: '', categoryId: '', price: '', kind: 'vip', vipGroup: '', durationDays: '', productCode: '', active: true })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let active = true
    fetch(api('/v1/site/admin/store'), { credentials: 'include' }).then(response => response.ok ? response.json() : Promise.reject())
      .then(data => { if (active) setCatalog(data) })
      .catch(() => { if (active) setError('Não foi possível carregar o catálogo administrativo.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision])

  async function send(path, method, body) {
    const response = await fetch(api(path), {
      method, credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const messages = {
        invalid_category: 'A categoria precisa ter entre 2 e 40 caracteres.', category_exists: 'Já existe uma categoria com esse nome.',
        category_not_empty: 'Mova os produtos desta categoria antes de removê-la.',
        invalid_product: 'Revise os campos do produto. VIP exige grupo; produto exige código para o plugin.',
      }
      throw new Error(messages[data.error] || 'Não foi possível salvar as alterações.')
    }
    return data
  }

  async function saveCategory(event) {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      await send(categoryForm.id ? `/v1/site/admin/store/categories/${categoryForm.id}` : '/v1/site/admin/store/categories', categoryForm.id ? 'PATCH' : 'POST', { name: categoryForm.name })
      setCategoryForm({ id: null, name: '' }); setNotice('Categoria salva.'); setRevision(value => value + 1)
    } catch (requestError) { setError(requestError.message) } finally { setBusy(false) }
  }

  async function deleteCategory(category) {
    if (!window.confirm(`Remover a categoria ${category.name}?`)) return
    setError(''); setNotice('')
    try { await send(`/v1/site/admin/store/categories/${category.id}`, 'DELETE'); setNotice('Categoria removida.'); setRevision(value => value + 1) }
    catch (requestError) { setError(requestError.message) }
  }

  async function saveProduct(event) {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      const data = { ...productForm, categoryId: Number(productForm.categoryId), price: productForm.price.trim(), durationDays: productForm.durationDays || null }
      await send(editingProduct ? `/v1/site/admin/store/products/${editingProduct}` : '/v1/site/admin/store/products', editingProduct ? 'PATCH' : 'POST', data)
      setEditingProduct(null)
      setProductForm({ name: '', description: '', categoryId: String(catalog.categories[0]?.id || ''), price: '', kind: 'vip', vipGroup: '', durationDays: '', productCode: '', active: true })
      setNotice(editingProduct ? 'Produto atualizado.' : 'Produto criado.')
      setRevision(value => value + 1)
    } catch (requestError) { setError(requestError.message) } finally { setBusy(false) }
  }

  function editProduct(product) {
    setEditingProduct(product.id)
    setProductForm({
      name: product.name, description: product.description, categoryId: String(product.categoryId),
      price: (product.priceCents / 100).toFixed(2), kind: product.kind, vipGroup: product.vipGroup || '',
      durationDays: product.durationDays || '', productCode: product.productCode || '', active: Boolean(product.active),
    })
  }

  async function disableProduct(product) {
    if (!window.confirm(`Desativar ${product.name}? O histórico de pedidos será preservado.`)) return
    setError(''); setNotice('')
    try { await send(`/v1/site/admin/store/products/${product.id}`, 'DELETE'); setNotice('Produto desativado.'); setRevision(value => value + 1) }
    catch (requestError) { setError(requestError.message) }
  }

  return <div className="admin-workspace store-editor">
    <div className="admin-toolbar"><div><strong>Catálogo da loja</strong><small>Gerencie categorias, ofertas e disponibilidade.</small></div><button className="refresh-button" onClick={() => setEditorMode(value => !value)}>{editorMode ? 'Sair do modo editor' : <><Pencil size={14} /> Ativar modo editor</>}</button></div>
    {error && <p className="login-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
    {loading ? <p className="store-status">Carregando catálogo…</p> : <>
      {editorMode && <>
        <section className="store-admin-section"><h2>Categorias</h2>
          <form className="store-category-form" onSubmit={saveCategory}><label>{categoryForm.id ? 'Editar categoria' : 'Nova categoria'}<input required minLength={2} maxLength={40} value={categoryForm.name} onChange={event => setCategoryForm(current => ({ ...current, name: event.target.value }))} placeholder="Ex.: VIPs" /></label><button className="button button-primary" disabled={busy}>{categoryForm.id ? 'Salvar' : 'Criar'} <Save size={15} /></button>{categoryForm.id && <button className="admin-back" type="button" onClick={() => setCategoryForm({ id: null, name: '' })}>Cancelar</button>}</form>
          <div className="store-category-list">{catalog.categories.map(item => <article key={item.id}><strong>{item.name}</strong><div><button className="refresh-button" onClick={() => setCategoryForm({ id: item.id, name: item.name })} aria-label={`Editar ${item.name}`} title="Editar categoria"><Pencil size={14} /></button><button className="admin-dismiss" onClick={() => deleteCategory(item)} aria-label={`Remover ${item.name}`} title="Remover categoria"><Trash2 size={15} /></button></div></article>)}{catalog.categories.length === 0 && <p className="admin-empty">Crie uma categoria para começar.</p>}</div>
        </section>
        <section className="store-admin-section"><h2>{editingProduct ? 'Editar produto' : 'Novo produto'}</h2>
          <form className="store-product-form" onSubmit={saveProduct}>
            <label>Nome<input required minLength={2} maxLength={80} value={productForm.name} onChange={event => setProductForm(current => ({ ...current, name: event.target.value }))} /></label>
            <label>Categoria<select required disabled={!catalog.categories.length} value={productForm.categoryId} onChange={event => setProductForm(current => ({ ...current, categoryId: event.target.value }))}><option value="">Selecione</option>{catalog.categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Preço (R$)<input required type="number" min="1" max="1000000" step="0.01" value={productForm.price} onChange={event => setProductForm(current => ({ ...current, price: event.target.value }))} /></label>
            <label>Tipo<select value={productForm.kind} onChange={event => setProductForm(current => ({ ...current, kind: event.target.value }))}><option value="vip">VIP</option><option value="product">Outro produto</option></select></label>
            {productForm.kind === 'vip' ? <><label>Grupo LuckPerms<input required maxLength={64} pattern="[A-Za-z0-9._-]+" value={productForm.vipGroup} onChange={event => setProductForm(current => ({ ...current, vipGroup: event.target.value }))} /></label><label>Duração em dias<input type="number" min="1" max="3650" placeholder="Vazio = permanente" value={productForm.durationDays} onChange={event => setProductForm(current => ({ ...current, durationDays: event.target.value }))} /></label></> : <label>Código para o plugin<input required maxLength={64} pattern="[A-Za-z0-9._-]+" value={productForm.productCode} onChange={event => setProductForm(current => ({ ...current, productCode: event.target.value }))} /></label>}
            <label className="store-description-label">Descrição<textarea maxLength={1000} rows={3} value={productForm.description} onChange={event => setProductForm(current => ({ ...current, description: event.target.value }))} /></label>
            <label className="store-active-label"><input type="checkbox" checked={productForm.active} onChange={event => setProductForm(current => ({ ...current, active: event.target.checked }))} /> Produto disponível na loja</label>
            <div className="store-product-form-actions"><button className="button button-primary" disabled={busy || !catalog.categories.length}>{busy ? 'Salvando…' : editingProduct ? 'Salvar produto' : 'Criar produto'} <Save size={15} /></button>{editingProduct && <button type="button" className="admin-back" onClick={() => { setEditingProduct(null); setProductForm({ name: '', description: '', categoryId: String(catalog.categories[0]?.id || ''), price: '', kind: 'vip', vipGroup: '', durationDays: '', productCode: '', active: true }) }}>Cancelar edição</button>}</div>
          </form>
        </section>
      </>}
      <section className="store-admin-section"><h2>Produtos cadastrados</h2><div className="store-admin-products">{catalog.products.map(item => <article className={!item.active ? 'disabled' : ''} key={item.id}><div><strong>{item.name}</strong><small>{item.category} · {item.kind === 'vip' ? `VIP · ${item.vipGroup}` : `Produto · ${item.productCode}`} · {(item.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</small></div><span>{item.active ? 'Ativo' : 'Desativado'}</span>{editorMode && <div><button className="refresh-button" onClick={() => editProduct(item)} aria-label={`Editar ${item.name}`} title="Editar produto"><Pencil size={14} /></button>{item.active && <button className="admin-dismiss" onClick={() => disableProduct(item)} aria-label={`Desativar ${item.name}`} title="Desativar produto"><Trash2 size={15} /></button>}</div>}</article>)}{catalog.products.length === 0 && <p className="admin-empty">Nenhum produto cadastrado.</p>}</div></section>
    </>}
  </div>
}

function adminError(code) {
  return ({
    admin_not_configured: 'O nick administrador ainda não foi configurado na API.',
    invalid_credentials: 'Nick ou senha inválidos.',
    invalid_or_expired_token: 'Código inválido ou expirado. Gere outro código.',
    email_required: 'Cadastre e confirme um e-mail em Minha Conta antes de entrar no painel.',
    email_unavailable: 'Não foi possível enviar o código agora. Tente novamente mais tarde.',
    invalid_email_policy: 'Informe um prazo entre 1 e 720 horas.',
    email_registration_required: 'Confirme seu e-mail em Minha Conta para continuar.',
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
