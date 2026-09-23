import { useEffect, useMemo, useState, createContext, useContext, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { useForm } from 'react-hook-form';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  HeartPulse,
  History,
  Home as HomeIcon,
  Info,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TriangleAlert,
  X,
} from 'lucide-react';
import {
  getGetAssessmentQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetMeQueryKey,
  getListAssessmentsQueryKey,
  setAuthTokenGetter,
  useCreateAssessment,
  useGetAssessment,
  useGetDashboardSummary,
  useGetMe,
  useHealthCheck,
  useListAssessments,
  useLogin,
  useRegister,
  type Assessment,
  type AssessmentInput,
  type AuthResponse,
  type DashboardSummary,
  type UrgencyLevel,
  type User,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const TOKEN_KEY = 'carepulse_token';

if (typeof window !== 'undefined') {
  setAuthTokenGetter(() => window.localStorage.getItem(TOKEN_KEY));
}

type AuthContextValue = {
  user: User | null;
  token: string | null;
  setAuth: (response: AuthResponse) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY),
  );
  const meQuery = useGetMe({
    query: { enabled: Boolean(token), queryKey: getGetMeQueryKey() },
  });

  const setAuth = (response: AuthResponse) => {
    window.localStorage.setItem(TOKEN_KEY, response.token);
    setToken(response.token);
    queryClient.setQueryData(getGetMeQueryKey(), response.user);
  };
  const logout = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user: meQuery.data ?? null, token, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="brand-mark" data-testid="link-brand">
      <span className={`brand-icon ${light ? 'brand-icon-light' : ''}`} aria-hidden="true">
        <HeartPulse size={19} strokeWidth={2.4} />
      </span>
      <span className={light ? 'text-sand' : ''}>CarePulse</span>
      <span className="brand-ai">AI</span>
    </Link>
  );
}

function PublicHeader() {
  return (
    <header className="public-header">
      <Logo />
      <nav className="public-nav" aria-label="Main navigation">
        <a href="#how-it-works" data-testid="link-how-it-works">How it works</a>
        <a href="#safety" data-testid="link-safety">Safety first</a>
        <Link href="/auth/login" className="nav-login" data-testid="link-login">Sign in</Link>
        <Link href="/auth/register" className="button button-small" data-testid="link-get-started">Get started</Link>
      </nav>
    </header>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: HomeIcon },
    { href: '/checkup', label: 'Start a checkup', icon: Plus },
    { href: '/history', label: 'Assessment history', icon: History },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <Logo light />
          <button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close menu" data-testid="button-close-menu">
            <X size={18} />
          </button>
        </div>
        <div className="sidebar-intro">
          <span className="sidebar-kicker">Your health, clearer</span>
          <p>A calm place to make sense of symptoms and prepare for care.</p>
        </div>
        <nav className="side-nav" aria-label="App navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`side-link ${location === item.href ? 'side-link-active' : ''}`}
                onClick={() => setMobileOpen(false)}
                data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.href === '/checkup' && <span className="side-link-plus"><Plus size={14} /></span>}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={17} />
          <div>
            <strong>Not a diagnosis</strong>
            <span>Use CarePulse to prepare, not replace professional care.</span>
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="profile-row">
            <span className="avatar">{user?.name?.slice(0, 1).toUpperCase() ?? 'C'}</span>
            <div className="profile-copy">
              <strong data-testid="text-user-name">{user?.name ?? 'CarePulse member'}</strong>
              <span>{user?.email ?? 'Signed in'}</span>
            </div>
          </div>
          <button className="logout-button" onClick={logout} data-testid="button-logout">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      {mobileOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} data-testid="button-sidebar-scrim" />}
      <main className="app-main">
        <div className="mobile-topbar">
          <button className="icon-button" onClick={() => setMobileOpen(true)} aria-label="Open menu" data-testid="button-open-menu"><Menu size={21} /></button>
          <Logo />
          <Link href="/checkup" className="mobile-add" aria-label="Start checkup" data-testid="link-mobile-checkup"><Plus size={18} /></Link>
        </div>
        {children}
      </main>
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!token) setLocation('/auth/login');
  }, [token, setLocation]);
  if (!token) return <PageLoader label="Opening your secure space…" />;
  if (!user) return <PageLoader label="Checking your account…" />;
  return <AppShell>{children}</AppShell>;
}

function PageLoader({ label = 'Loading your care space…' }: { label?: string }) {
  return (
    <div className="full-page-state" data-testid="state-loading">
      <div className="loading-pulse"><HeartPulse size={26} /></div>
      <div className="skeleton-line skeleton-line-wide" />
      <p>{label}</p>
    </div>
  );
}

function QueryError({ onRetry, detail = 'We couldn’t load this right now.' }: { onRetry?: () => void; detail?: string }) {
  return (
    <div className="state-card state-error" role="alert" data-testid="state-error">
      <div className="state-icon state-icon-error"><AlertCircle size={22} /></div>
      <div>
        <h3>Something got in the way</h3>
        <p>{detail} Your information is safe. Please try again.</p>
        {onRetry && <button className="button button-secondary button-small" onClick={onRetry} data-testid="button-retry">Try again</button>}
      </div>
    </div>
  );
}

function UrgencyPill({ level }: { level: UrgencyLevel | string }) {
  const normalized = String(level);
  const className =
    normalized === 'EMERGENCY_IMMEDIATE_CARE' ? 'urgency-emergency' :
      normalized === 'Urgent Care' ? 'urgency-urgent' :
        normalized === 'Routine Consultation' ? 'urgency-routine' : 'urgency-self';
  const label = normalized === 'EMERGENCY_IMMEDIATE_CARE' ? 'Immediate care' : normalized;
  return <span className={`urgency-pill ${className}`} data-testid={`status-urgency-${normalized.toLowerCase().replaceAll(' ', '-')}`}>{label}</span>;
}

function StatCard({ icon: Icon, label, value, note, tone = 'mint' }: { icon: typeof Activity; label: string; value: string | number; note: string; tone?: string }) {
  return (
    <div className={`stat-card stat-${tone}`} data-testid={`card-stat-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <div className="stat-top"><span className="stat-icon"><Icon size={18} /></span><span>{label}</span></div>
      <strong data-testid={`value-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function AssessmentCard({ assessment }: { assessment: Assessment }) {
  return (
    <Link href={`/assessment/${assessment.id}`} className="assessment-card" data-testid={`card-assessment-${assessment.id}`}>
      <div className="assessment-card-top">
        <span className="assessment-date">{formatDate(assessment.createdAt)}</span>
        <UrgencyPill level={assessment.urgencyLevel} />
      </div>
      <h3>{truncate(assessment.primarySymptoms, 88)}</h3>
      <p><Clock3 size={14} /> {assessment.duration} <span className="dot-separator" /> Severity {assessment.severity}/10</p>
      <span className="assessment-card-link">View care guidance <ChevronRight size={15} /></span>
    </Link>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
function truncate(text: string, length: number) {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function Home() {
  const health = useHealthCheck({ query: { queryKey: ['/api/healthz'] } });
  return (
    <div className="public-page">
      <PublicHeader />
      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> Health guidance, made human</span>
            <h1>When symptoms feel uncertain, <em>start here.</em></h1>
            <p className="hero-lede">CarePulse helps you turn a confusing symptom into a clear next step — and a better conversation with your clinician.</p>
            <div className="hero-actions">
              <Link href="/auth/register" className="button button-primary button-large" data-testid="link-hero-start">Start a checkup <ArrowRight size={17} /></Link>
              <a href="#how-it-works" className="text-link" data-testid="link-hero-how">See how it works <ChevronRight size={16} /></a>
            </div>
            <div className="trust-row">
              <span><ShieldCheck size={15} /> Private by design</span>
              <span><CheckCircle2 size={15} /> Built for clarity</span>
              <span><Stethoscope size={15} /> Not a diagnosis</span>
            </div>
          </div>
          <div className="hero-art" aria-label="Illustration of a steady pulse line">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="pulse-card">
              <div className="pulse-card-top"><span className="pulse-live"><span /> CAREPULSE CHECK</span><Activity size={19} /></div>
              <div className="pulse-wave"><span /><span /><span /><span /><span /><span /><span /></div>
              <div className="pulse-card-bottom"><strong>A clearer next step</strong><small>without the panic spiral</small></div>
            </div>
            <div className="hero-float float-one"><Check size={14} /><span>Simple, structured questions</span></div>
            <div className="hero-float float-two"><ShieldCheck size={14} /><span>Safety always comes first</span></div>
          </div>
        </section>

        <section className="notice-band" id="safety">
          <div className="notice-inner"><TriangleAlert size={20} /><div><strong>If this feels life-threatening, call emergency services now.</strong><span>CarePulse is not for emergencies and does not replace a clinician.</span></div><span className="notice-available">{health.data?.status === 'ok' ? 'Service ready' : 'Here when you need it'}</span></div>
        </section>

        <section className="how-section section-wrap" id="how-it-works">
          <div className="section-heading"><span className="eyebrow">A gentler way to begin</span><h2>From “what is happening?”<br /><em>to “what should I do?”</em></h2><p>No rabbit holes. No intimidating medical language. Just thoughtful prompts and practical context to help you decide what comes next.</p></div>
          <div className="steps-grid">
            <div className="step-card"><span className="step-number">01</span><div className="step-icon"><FileText size={22} /></div><h3>Tell us what’s going on</h3><p>Answer a few guided questions about your symptoms, timing, and health context.</p></div>
            <div className="step-card step-card-featured"><span className="step-number">02</span><div className="step-icon"><Sparkles size={22} /></div><h3>Get a calm read on urgency</h3><p>See the level of care to consider, what might be relevant, and which warning signs matter.</p></div>
            <div className="step-card"><span className="step-number">03</span><div className="step-icon"><BookOpen size={22} /></div><h3>Bring better notes to care</h3><p>Keep your assessment and doctor questions together so you can make the most of your visit.</p></div>
          </div>
        </section>

        <section className="quote-section"><div className="quote-mark">“</div><blockquote>Good health decisions start with good questions. CarePulse helps you find yours.</blockquote><span>— designed for the moment before you call the doctor</span></section>
        <section className="final-cta section-wrap"><div><span className="eyebrow">A steadier first step</span><h2>You don’t have to figure it out alone.</h2></div><Link href="/auth/register" className="button button-primary button-large" data-testid="link-final-start">Create your free account <ArrowRight size={17} /></Link></section>
      </main>
      <footer className="public-footer"><Logo /><span>Thoughtful guidance for the in-between moments.</span><span className="footer-disclaimer">CarePulse AI is for information and preparation only.</span></footer>
    </div>
  );
}

type AuthForm = { name?: string; email: string; password: string; confirmPassword?: string };

function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { setAuth } = useAuth();
  const [, setLocation] = useLocation();
  const isRegister = mode === 'register';
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const mutation = isRegister ? registerMutation : loginMutation;
  const { register, handleSubmit, formState: { errors } } = useForm<AuthForm>();
  const [formError, setFormError] = useState('');
  const submit = (values: AuthForm) => {
    setFormError('');
    if (isRegister && values.password !== values.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (isRegister) {
      registerMutation.mutate({ data: { name: values.name ?? '', email: values.email, password: values.password } }, {
        onSuccess: (response) => { setAuth(response); setLocation('/dashboard'); },
        onError: (error) => setFormError(getErrorMessage(error, 'We couldn’t create your account.')),
      });
    } else {
      loginMutation.mutate({ data: { email: values.email, password: values.password } }, {
        onSuccess: (response) => { setAuth(response); setLocation('/dashboard'); },
        onError: (error) => setFormError(getErrorMessage(error, 'We couldn’t sign you in.')),
      });
    }
  };
  return (
    <div className="auth-page">
      <div className="auth-aside"><Logo light /><div className="auth-aside-copy"><span className="eyebrow eyebrow-light">Care, without the noise</span><h1>A clearer way to listen to your body.</h1><p>Save your assessments, spot patterns over time, and walk into care feeling prepared.</p></div><div className="auth-aside-note"><ShieldCheck size={17} /><span>Your information stays yours.</span></div></div>
      <main className="auth-main">
        <div className="auth-mobile-brand"><Logo /></div>
        <div className="auth-form-wrap">
          <Link href="/" className="back-link" data-testid="link-back-home"><ArrowLeft size={16} /> Back to home</Link>
          <span className="eyebrow">{isRegister ? 'Begin with CarePulse' : 'Welcome back'}</span>
          <h2>{isRegister ? 'Create a calmer care log.' : 'Good to see you again.'}</h2>
          <p className="auth-subtitle">{isRegister ? 'A free account keeps your checkups and questions together.' : 'Pick up where you left off, with your health context close by.'}</p>
          {formError && <div className="form-alert" role="alert" data-testid="alert-auth-error"><AlertCircle size={17} /> {formError}</div>}
          <form onSubmit={handleSubmit(submit)} className="auth-form">
            {isRegister && <label className="field-label">Your name<input data-testid="input-name" className="input" placeholder="How should we call you?" {...register('name', { required: 'Tell us your name.', minLength: { value: 2, message: 'Use at least 2 characters.' } })} />{errors.name && <span className="field-error">{errors.name.message}</span>}</label>}
            <label className="field-label">Email address<input data-testid="input-email" type="email" className="input" placeholder="you@example.com" {...register('email', { required: 'Enter your email.' })} />{errors.email && <span className="field-error">{errors.email.message}</span>}</label>
            <label className="field-label">Password<input data-testid="input-password" type="password" className="input" placeholder={isRegister ? 'At least 8 characters' : 'Your password'} {...register('password', { required: 'Enter your password.', minLength: isRegister ? { value: 8, message: 'Use at least 8 characters.' } : undefined })} />{errors.password && <span className="field-error">{errors.password.message}</span>}</label>
            {isRegister && <label className="field-label">Confirm password<input data-testid="input-confirm-password" type="password" className="input" placeholder="Repeat your password" {...register('confirmPassword', { required: 'Confirm your password.' })} />{errors.confirmPassword && <span className="field-error">{errors.confirmPassword.message}</span>}</label>}
            <button type="submit" className="button button-primary button-full button-large" disabled={mutation.isPending} data-testid="button-auth-submit">{mutation.isPending ? 'One moment…' : isRegister ? 'Create my account' : 'Sign in' } <ArrowRight size={17} /></button>
          </form>
          <p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to CarePulse?'} <Link href={isRegister ? '/auth/login' : '/auth/register'} data-testid="link-auth-switch">{isRegister ? 'Sign in' : 'Create an account'}</Link></p>
          <p className="tiny-legal">By continuing, you understand CarePulse provides educational guidance, not a medical diagnosis or emergency service.</p>
        </div>
      </main>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const summary = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const assessments = useListAssessments(undefined, { query: { queryKey: getListAssessmentsQueryKey() } });
  const recent = useMemo(() => (assessments.data ?? []).slice(0, 3), [assessments.data]);
  if (summary.isLoading || assessments.isLoading) return <PageLoader label="Gathering your recent care notes…" />;
  if (summary.isError) return <div className="page-wrap"><QueryError onRetry={() => summary.refetch()} /></div>;
  const data = summary.data as DashboardSummary | undefined;
  return (
    <div className="page-wrap">
      <div className="page-header dashboard-header"><div><span className="eyebrow">Your overview</span><h1>Good morning, {user?.name?.split(' ')[0] ?? 'there'}.</h1><p>Here’s a quiet look at your recent health notes.</p></div><Link href="/checkup" className="button button-primary" data-testid="link-start-checkup"><Plus size={18} /> Start a checkup</Link></div>
      <div className="dashboard-banner"><div className="banner-mark"><HeartPulse size={22} /></div><div><strong>Need help making sense of something today?</strong><p>A few thoughtful questions can turn uncertainty into a useful next step.</p></div><Link href="/checkup" className="banner-link" data-testid="link-banner-checkup">Begin <ArrowRight size={15} /></Link></div>
      <div className="stats-grid">
        <StatCard icon={FileText} label="Total assessments" value={data?.totalAssessments ?? 0} note="All time" tone="mint" />
        <StatCard icon={Clock3} label="This month" value={data?.thisMonth ?? 0} note="Recent check-ins" tone="sand" />
        <StatCard icon={TriangleAlert} label="Needs attention" value={(data?.urgencyCounts?.['Urgent Care'] ?? 0) + (data?.urgencyCounts?.EMERGENCY_IMMEDIATE_CARE ?? 0)} note="Urgent or immediate" tone="coral" />
      </div>
      <div className="content-columns">
        <section className="content-section"><div className="section-row"><div><span className="eyebrow">Your latest notes</span><h2>Recent assessments</h2></div><Link href="/history" className="text-link" data-testid="link-view-history">View all <ChevronRight size={15} /></Link></div>{recent.length ? <div className="assessment-list">{recent.map((item) => <AssessmentCard key={item.id} assessment={item} />)}</div> : <EmptyAssessments />}</section>
        <aside className="side-summary"><div className="section-row"><div><span className="eyebrow">At a glance</span><h2>Urgency mix</h2></div><CircleHelp size={18} className="muted-icon" /></div><UrgencyBars counts={data?.urgencyCounts ?? {}} /><div className="summary-note"><Info size={15} /><span>Urgency is a guide for your next conversation, not a diagnosis.</span></div></aside>
      </div>
    </div>
  );
}

function EmptyAssessments() {
  return <div className="empty-state" data-testid="state-empty-assessments"><div className="empty-illustration"><FileText size={27} /></div><h3>Your care notes will live here</h3><p>Start your first checkup to get a personal, practical read on what to do next.</p><Link href="/checkup" className="button button-secondary button-small" data-testid="link-empty-start"><Plus size={16} /> Start a checkup</Link></div>;
}

function UrgencyBars({ counts }: { counts: Record<string, number> }) {
  const rows = [
    { label: 'Self-care', key: 'Self-Care', color: 'bar-self' },
    { label: 'Routine consultation', key: 'Routine Consultation', color: 'bar-routine' },
    { label: 'Urgent care', key: 'Urgent Care', color: 'bar-urgent' },
    { label: 'Immediate care', key: 'EMERGENCY_IMMEDIATE_CARE', color: 'bar-emergency' },
  ];
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return <div className="urgency-bars">{rows.map((row) => <div className="urgency-bar-row" key={row.key}><div><span>{row.label}</span><strong>{counts[row.key] ?? 0}</strong></div><div className="bar-track"><span className={row.color} style={{ width: `${Math.max((counts[row.key] ?? 0) / total * 100, counts[row.key] ? 7 : 0)}%` }} /></div></div>)}</div>;
}

function Checkup() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const create = useCreateAssessment();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const form = useForm<AssessmentInput>({ defaultValues: { age: undefined, biologicalSex: '', primarySymptoms: '', duration: '', severity: 5, chronicConditions: '', currentMedications: '' } });
  const steps = ['Basics', 'Symptoms', 'Health context'];
  const goNext = async () => {
    const fields: (keyof AssessmentInput)[] = step === 1 ? ['age', 'biologicalSex'] : step === 2 ? ['primarySymptoms', 'duration', 'severity'] : [];
    const valid = await form.trigger(fields);
    if (valid) { setError(''); setStep((current) => Math.min(current + 1, 3)); } else setError('A little more detail will help us make this useful.');
  };
  const submit = (values: AssessmentInput) => {
    setError('');
    create.mutate({ data: { ...values, age: Number(values.age), severity: Number(values.severity), chronicConditions: values.chronicConditions || undefined, currentMedications: values.currentMedications || undefined } }, {
      onSuccess: (assessment) => {
        queryClient.invalidateQueries({ queryKey: getListAssessmentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.setQueryData(getGetAssessmentQueryKey(assessment.id), assessment);
        setLocation(`/assessment/${assessment.id}`);
      },
      onError: (mutationError) => setError(getErrorMessage(mutationError, 'We couldn’t complete your checkup.')),
    });
  };
  return (
    <div className="page-wrap checkup-page">
      <div className="page-header"><div><Link href="/dashboard" className="back-link" data-testid="link-checkup-back"><ArrowLeft size={16} /> Back to overview</Link><span className="eyebrow">New assessment</span><h1>Let’s make sense of it.</h1><p>Answer what you can. There are no perfect answers here.</p></div><span className="safe-chip"><ShieldCheck size={15} /> Private and secure</span></div>
      <div className="checkup-layout">
        <aside className="checkup-progress"><span className="progress-label">CHECKUP PROGRESS</span>{steps.map((label, index) => <div className={`progress-step ${step === index + 1 ? 'progress-current' : ''} ${step > index + 1 ? 'progress-complete' : ''}`} key={label}><span>{step > index + 1 ? <Check size={14} /> : index + 1}</span><strong>{label}</strong>{index < steps.length - 1 && <i />}</div>)}<div className="progress-help"><CircleHelp size={17} /><div><strong>Not sure?</strong><span>Share your best estimate. You can always speak with a clinician.</span></div></div></aside>
        <section className="checkup-card">
          <form onSubmit={form.handleSubmit(submit)}>
            {step === 1 && <div className="form-step"><span className="step-overline">STEP 1 OF 3</span><h2>Let’s start with the basics.</h2><p className="step-description">This context helps us keep the guidance relevant to you.</p><label className="field-label">How old are you?<input data-testid="input-age" type="number" min="0" max="120" className="input input-large" placeholder="Your age" {...form.register('age', { required: 'Enter your age.', valueAsNumber: true, min: { value: 0, message: 'Enter a valid age.' }, max: { value: 120, message: 'Enter a valid age.' } })} />{form.formState.errors.age && <span className="field-error">{form.formState.errors.age.message}</span>}</label><label className="field-label">Biological sex <span className="label-optional">used only for health context</span><select data-testid="select-biological-sex" className="input input-large" {...form.register('biologicalSex', { required: 'Choose an option.' })}><option value="">Select an option</option><option value="Female">Female</option><option value="Male">Male</option><option value="Intersex">Intersex</option><option value="Prefer not to say">Prefer not to say</option></select>{form.formState.errors.biologicalSex && <span className="field-error">{form.formState.errors.biologicalSex.message}</span>}</label></div>}
            {step === 2 && <div className="form-step"><span className="step-overline">STEP 2 OF 3</span><h2>Tell us what you’re feeling.</h2><p className="step-description">Plain language is perfect. Include what feels most important.</p><label className="field-label">What are your main symptoms?<textarea data-testid="input-primary-symptoms" className="input textarea" rows={5} placeholder="For example: a sore throat and headache that started yesterday…" {...form.register('primarySymptoms', { required: 'Describe your main symptoms.', minLength: { value: 3, message: 'Add a little more detail.' } })} />{form.formState.errors.primarySymptoms && <span className="field-error">{form.formState.errors.primarySymptoms.message}</span>}</label><div className="field-grid"><label className="field-label">How long has this been going on?<input data-testid="input-duration" className="input" placeholder="e.g. 2 days" {...form.register('duration', { required: 'Add a duration.' })} />{form.formState.errors.duration && <span className="field-error">{form.formState.errors.duration.message}</span>}</label><label className="field-label">How severe is it? <span className="severity-value">{form.watch('severity')}/10</span><input data-testid="input-severity" type="range" min="1" max="10" className="range-input" {...form.register('severity', { valueAsNumber: true, required: true })} /><span className="range-labels"><span>Mild</span><span>Severe</span></span></label></div></div>}
            {step === 3 && <div className="form-step"><span className="step-overline">STEP 3 OF 3</span><h2>A little more context.</h2><p className="step-description">Optional, but helpful for a more grounded result. Leave anything blank that doesn’t apply.</p><label className="field-label">Chronic conditions <span className="label-optional">optional</span><textarea data-testid="input-chronic-conditions" className="input textarea" rows={3} placeholder="e.g. asthma, diabetes, migraine…" {...form.register('chronicConditions')} /></label><label className="field-label">Current medications <span className="label-optional">optional</span><textarea data-testid="input-current-medications" className="input textarea" rows={3} placeholder="Include regular medicines or supplements…" {...form.register('currentMedications')} /></label><div className="privacy-callout"><ShieldCheck size={18} /><span>Your answers are used to create this assessment and are not a substitute for professional medical advice.</span></div></div>}
            {error && <div className="form-alert" role="alert" data-testid="alert-checkup-error"><AlertCircle size={17} /> {error}</div>}
            <div className="form-actions">{step > 1 ? <button type="button" className="button button-secondary" onClick={() => setStep((current) => current - 1)} data-testid="button-previous-step"><ArrowLeft size={16} /> Back</button> : <span />}{step < 3 ? <button type="button" className="button button-primary" onClick={goNext} data-testid="button-next-step">Continue <ArrowRight size={16} /></button> : <button type="submit" className="button button-primary" disabled={create.isPending} data-testid="button-submit-assessment">{create.isPending ? 'Reading your answers…' : 'See my next step'} <ArrowRight size={16} /></button>}</div>
          </form>
        </section>
      </div>
    </div>
  );
}

function AssessmentDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const query = useGetAssessment(id, { query: { enabled: Number.isFinite(id), queryKey: getGetAssessmentQueryKey(id) } });
  if (query.isLoading) return <PageLoader label="Preparing your care guidance…" />;
  if (query.isError || !query.data) return <div className="page-wrap"><QueryError onRetry={() => query.refetch()} detail="We couldn’t find that assessment." /></div>;
  const assessment = query.data;
  const analysis = assessment.aiAnalysis;
  const emergency = assessment.urgencyLevel === 'EMERGENCY_IMMEDIATE_CARE' || analysis.redFlagWarnings.length > 0;
  return (
    <div className="page-wrap detail-page">
      <div className="page-header"><div><Link href="/history" className="back-link" data-testid="link-assessment-back"><ArrowLeft size={16} /> Assessment history</Link><span className="eyebrow">Assessment from {formatDate(assessment.createdAt)}</span><h1>Your care guidance</h1><p>Use this as a conversation starter with a qualified clinician.</p></div><button className="button button-secondary button-small" onClick={() => window.print()} data-testid="button-print-assessment"><FileText size={16} /> Save / print</button></div>
      {emergency && <div className="emergency-panel" role="alert" data-testid="panel-emergency"><div className="emergency-icon"><TriangleAlert size={25} /></div><div><span className="emergency-label">ACT NOW</span><h2>Seek immediate medical care</h2><p>{analysis.redFlagWarnings[0] ?? 'Your answers suggest symptoms that should be assessed urgently.'}</p><strong>If you may be in immediate danger, call your local emergency number now.</strong></div></div>}
      <div className="result-hero"><div><span className="eyebrow">Suggested level of care</span><div className="result-level"><UrgencyPill level={assessment.urgencyLevel} /><span>{assessment.duration} of symptoms · severity {assessment.severity}/10</span></div></div><div className="result-summary"><Sparkles size={20} /><p>{analysis.summary}</p></div></div>
      <div className="detail-grid">
        <section className="detail-main"><ResultSection icon={Activity} eyebrow="A useful starting point" title="What this may mean"><p className="prose-copy">{analysis.summary}</p><div className="cause-list">{analysis.potentialCauses.map((cause, index) => <div className="cause-item" key={`${cause.name}-${index}`}><div className="cause-top"><strong>{cause.name}</strong><span className={`likelihood likelihood-${cause.likelihood.toLowerCase()}`}>{cause.likelihood} possibility</span></div><p>{cause.description}</p></div>)}</div></ResultSection><ResultSection icon={CheckCircle2} eyebrow="Practical next steps" title="What you can do now"><ul className="guidance-list">{analysis.recommendedActions.map((action, index) => <li key={`${action}-${index}`}><span><Check size={14} /></span>{action}</li>)}</ul></ResultSection><ResultSection icon={CircleHelp} eyebrow="Take these to your appointment" title="Questions for your doctor"><ul className="question-list">{analysis.questionsForDoctor.map((question, index) => <li key={`${question}-${index}`}><span>{index + 1}</span>{question}</li>)}</ul></ResultSection></section>
        <aside className="detail-side"><div className="red-flag-card"><div className="red-flag-heading"><TriangleAlert size={18} /><h3>Watch for these signs</h3></div>{analysis.redFlagWarnings.length ? <ul>{analysis.redFlagWarnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul> : <p>No specific red flags were identified from your answers. If anything changes or feels severe, seek care.</p>}</div><div className="context-card"><span className="eyebrow">Your checkup context</span><div><span>Age</span><strong>{assessment.age}</strong></div><div><span>Symptoms</span><strong>{truncate(assessment.primarySymptoms, 72)}</strong></div><div><span>Health context</span><strong>{assessment.chronicConditions || 'None shared'}</strong></div></div><div className="disclaimer-card"><Info size={17} /><div><strong>A note on CarePulse</strong><p>{analysis.disclaimer}</p></div></div></aside>
      </div>
    </div>
  );
}

function ResultSection({ icon: Icon, eyebrow, title, children }: { icon: typeof Activity; eyebrow: string; title: string; children: ReactNode }) {
  return <section className="result-section"><div className="result-section-heading"><span className="result-icon"><Icon size={18} /></span><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div></div>{children}</section>;
}

function HistoryPage() {
  const assessments = useListAssessments(undefined, { query: { queryKey: getListAssessmentsQueryKey() } });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const items = useMemo(() => (assessments.data ?? []).filter((assessment) => {
    const matchesSearch = `${assessment.primarySymptoms} ${assessment.urgencyLevel}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || assessment.urgencyLevel === filter;
    return matchesSearch && matchesFilter;
  }), [assessments.data, search, filter]);
  if (assessments.isLoading) return <PageLoader label="Opening your assessment history…" />;
  if (assessments.isError) return <div className="page-wrap"><QueryError onRetry={() => assessments.refetch()} /></div>;
  return <div className="page-wrap history-page"><div className="page-header"><div><span className="eyebrow">Your care log</span><h1>Assessment history</h1><p>A private record of the questions you’ve explored with CarePulse.</p></div><Link href="/checkup" className="button button-primary" data-testid="link-history-new"><Plus size={18} /> New checkup</Link></div><div className="history-toolbar"><label className="search-field"><Search size={17} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search symptoms or urgency…" data-testid="input-history-search" /></label><select className="filter-select" value={filter} onChange={(event) => setFilter(event.target.value)} data-testid="select-history-filter"><option value="all">All urgency levels</option><option value="Self-Care">Self-care</option><option value="Routine Consultation">Routine consultation</option><option value="Urgent Care">Urgent care</option><option value="EMERGENCY_IMMEDIATE_CARE">Immediate care</option></select></div>{items.length ? <div className="history-list">{items.map((assessment) => <AssessmentCard key={assessment.id} assessment={assessment} />)}</div> : <div className="empty-state empty-history" data-testid="state-history-empty"><div className="empty-illustration"><Search size={27} /></div><h3>{assessments.data?.length ? 'No matching assessments' : 'Your history is ready when you are'}</h3><p>{assessments.data?.length ? 'Try a different search or urgency filter.' : 'A completed checkup will appear here, ready to revisit whenever you need it.'}</p>{assessments.data?.length ? <button className="button button-secondary button-small" onClick={() => { setSearch(''); setFilter('all'); }} data-testid="button-clear-history-filter">Clear filters</button> : <Link href="/checkup" className="button button-secondary button-small" data-testid="link-history-empty-start"><Plus size={16} /> Start a checkup</Link>}</div>}</div>;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message.replace(/^HTTP \d+ [^:]+:\s*/, '');
  return fallback;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={Home} /><Route path="/auth/login"><AuthPage mode="login" /></Route><Route path="/auth/register"><AuthPage mode="register" /></Route><Route path="/dashboard"><Protected><Dashboard /></Protected></Route><Route path="/checkup"><Protected><Checkup /></Protected></Route><Route path="/assessment/:id"><Protected><AssessmentDetail /></Protected></Route><Route path="/history"><Protected><HistoryPage /></Protected></Route><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AuthProvider><Router /></AuthProvider></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;