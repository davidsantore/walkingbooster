import { useState, useEffect, useCallback } from 'react';
import {
  Zap, LogOut, Users, Key, Activity, Plus, Trash2,
  RefreshCw, Copy, Check, AlertCircle, Loader2,
  ShieldCheck, Shield, ChevronDown, ChevronUp, BarChart3
} from 'lucide-react';
import { adminApi, Account, BoostKey, BoostTask } from '../lib/api';

interface Props {
  token: string;
  onLogout: () => void;
}

type Tab = 'overview' | 'accounts' | 'keys' | 'tasks';

export default function AdminDashboard({ token, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [keys, setKeys] = useState<BoostKey[]>([]);
  const [tasks, setTasks] = useState<BoostTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [newToken, setNewToken] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);
  const [accountError, setAccountError] = useState('');

  const [newKeyCount, setNewKeyCount] = useState(2);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [keyError, setKeyError] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, a, k, t] = await Promise.all([
        adminApi.getStats(token),
        adminApi.getAccounts(token),
        adminApi.getKeys(token),
        adminApi.getTasks(token),
      ]);
      setStats(s);
      setAccounts(a);
      setKeys(k);
      setTasks(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function addAccount() {
    setAccountError('');
    if (!newToken.trim()) return setAccountError('Token obrigatório');
    setAddingAccount(true);
    try {
      const acc = await adminApi.addAccount(token, newToken.trim());
      setAccounts((p) => [acc, ...p]);
      setNewToken('');
      await adminApi.getStats(token).then(setStats);
    } catch (e) {
      setAccountError(e instanceof Error ? e.message : 'Erro ao adicionar conta');
    } finally {
      setAddingAccount(false);
    }
  }

  async function deleteAccount(id: string) {
    await adminApi.deleteAccount(token, id);
    setAccounts((p) => p.filter((a) => a.id !== id));
    adminApi.getStats(token).then(setStats);
  }

  async function refreshAccount(id: string) {
    const acc = await adminApi.refreshAccount(token, id);
    setAccounts((p) => p.map((a) => (a.id === id ? acc : a)));
  }

  async function createKey() {
    setKeyError('');
    if (newKeyCount < 1) return setKeyError('Mínimo de 1 boost');
    setCreatingKey(true);
    try {
      const k = await adminApi.createKey(token, newKeyCount, newKeyLabel);
      setKeys((p) => [k, ...p]);
      setNewKeyLabel('');
      adminApi.getStats(token).then(setStats);
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : 'Erro ao criar chave');
    } finally {
      setCreatingKey(false);
    }
  }

  async function deleteKey(id: string) {
    await adminApi.deleteKey(token, id);
    setKeys((p) => p.filter((k) => k.id !== id));
    adminApi.getStats(token).then(setStats);
  }

  function copyKey(keyValue: string, id: string) {
    navigator.clipboard.writeText(keyValue);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Visão Geral', icon: <BarChart3 size={14} /> },
    { id: 'accounts', label: 'Contas', icon: <Users size={14} /> },
    { id: 'keys', label: 'Chaves', icon: <Key size={14} /> },
    { id: 'tasks', label: 'Tarefas', icon: <Activity size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col relative z-10">
      <div className="flex flex-col md:flex-row min-h-screen">
        <aside className="w-full md:w-56 bg-gray-950 border-b md:border-b-0 md:border-r border-gray-800 flex md:flex-col shrink-0">
          <div className="hidden md:flex items-center gap-2 px-5 py-5 border-b border-gray-800">
            <img src="/IMG_5192.gif" alt="Walking Booster" className="w-8 h-8 object-contain" />
            <div>
              <p className="text-white font-bold text-xs">Walking</p>
              <p className="text-gray-500 text-xs">Booster Admin</p>
            </div>
          </div>

          <nav className="flex md:flex-col p-2 gap-1 w-full md:flex-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1 md:flex-none justify-center md:justify-start ${
                  tab === t.id
                    ? 'bg-white text-black border border-gray-700'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
                }`}
              >
                {t.icon}
                <span className="hidden md:inline">{t.label}</span>
              </button>
            ))}
          </nav>

          <div className="hidden md:block p-3 border-t border-gray-800">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 text-xs font-medium transition-all"
            >
              <LogOut size={13} />
              Sair
            </button>
          </div>
        </aside>

        <main className="flex-1 p-5 md:p-8 overflow-auto">
          {loading && (
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-6">
              <Loader2 size={13} className="animate-spin" />
              Carregando...
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm mb-6 p-3 bg-red-900/20 rounded-xl border border-red-800">
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          {tab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-white font-black text-xl mb-1">Visão Geral</h2>
                <p className="text-gray-500 text-sm">Resumo do sistema de boosting</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Contas', value: stats.total_accounts ?? 0, sub: `${stats.nitro_accounts ?? 0} com nitro` },
                  { label: 'Slots disponíveis', value: stats.total_slots ?? 0, sub: `${stats.valid_accounts ?? 0} contas válidas` },
                  { label: 'Chaves criadas', value: stats.total_keys ?? 0, sub: `${stats.used_keys ?? 0} utilizadas` },
                  { label: 'Tarefas', value: stats.total_tasks ?? 0, sub: `${stats.completed_tasks ?? 0} concluídas` },
                ].map((s, i) => (
                  <div key={i} className="rounded-2xl bg-gray-950 border border-gray-800 p-5">
                    <p className="text-3xl font-black text-white">{s.value}</p>
                    <p className="text-white font-semibold text-sm mt-1">{s.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={load}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-xs transition-colors"
              >
                <RefreshCw size={12} />
                Atualizar dados
              </button>
            </div>
          )}

          {tab === 'accounts' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-white font-black text-xl mb-1">Contas Discord</h2>
                <p className="text-gray-500 text-sm">Tokens para enviar impulsos</p>
              </div>

              <div className="rounded-2xl bg-gray-950 border border-gray-800 p-5">
                <p className="text-white font-semibold text-sm mb-3">Adicionar conta</p>
                <div className="flex gap-2">
                  <input
                    value={newToken}
                    onChange={(e) => setNewToken(e.target.value)}
                    placeholder="Token Discord da conta"
                    className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-gray-700 transition-colors font-mono"
                    type="password"
                  />
                  <button
                    onClick={addAccount}
                    disabled={addingAccount}
                    className="px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-100 transition-all disabled:opacity-60 flex items-center gap-2"
                  >
                    {addingAccount ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    Adicionar
                  </button>
                </div>
                {accountError && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle size={11} /> {accountError}
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-gray-950 border border-gray-800 overflow-hidden">
                {accounts.length === 0 ? (
                  <div className="p-8 text-center text-gray-600 text-sm">Nenhuma conta adicionada.</div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    <div className="grid grid-cols-12 px-5 py-2 text-gray-600 text-xs uppercase tracking-wider">
                      <span className="col-span-4">Usuário</span>
                      <span className="col-span-3">Token</span>
                      <span className="col-span-2 text-center">Slots</span>
                      <span className="col-span-2 text-center">Status</span>
                      <span className="col-span-1" />
                    </div>
                    {accounts.map((acc) => (
                      <div key={acc.id} className="grid grid-cols-12 px-5 py-3 items-center hover:bg-gray-900/50 transition-colors">
                        <div className="col-span-4 flex items-center gap-2 min-w-0">
                          {acc.avatar_url ? (
                            <img src={acc.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-gray-300 text-xs font-bold">
                              {(acc.username || '?')[0]}
                            </div>
                          )}
                          <span className="text-white text-sm font-medium truncate">{acc.username || 'Desconhecido'}</span>
                        </div>
                        <div className="col-span-3 text-gray-600 text-xs font-mono truncate">{acc.token_short}...</div>
                        <div className="col-span-2 text-center">
                          <span className={`text-sm font-bold ${acc.has_nitro ? 'text-white' : 'text-gray-600'}`}>
                            {acc.nitro_slots}
                          </span>
                        </div>
                        <div className="col-span-2 flex justify-center">
                          {acc.is_valid && acc.has_nitro ? (
                            <ShieldCheck size={14} className="text-white" />
                          ) : acc.is_valid ? (
                            <Shield size={14} className="text-gray-500" />
                          ) : (
                            <Shield size={14} className="text-red-400" />
                          )}
                        </div>
                        <div className="col-span-1 flex items-center justify-end gap-1">
                          <button
                            onClick={() => refreshAccount(acc.id)}
                            className="p-1.5 text-gray-600 hover:text-gray-300 transition-colors rounded"
                          >
                            <RefreshCw size={12} />
                          </button>
                          <button
                            onClick={() => deleteAccount(acc.id)}
                            className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'keys' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-white font-black text-xl mb-1">Chaves de Boost</h2>
                <p className="text-gray-500 text-sm">Crie e gerencie chaves para os usuários</p>
              </div>

              <div className="rounded-2xl bg-gray-950 border border-gray-800 p-5">
                <p className="text-white font-semibold text-sm mb-3">Criar nova chave</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                    placeholder="Label (opcional)"
                    className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-gray-700 transition-colors"
                  />
                  <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3">
                    <button
                      onClick={() => setNewKeyCount(Math.max(1, newKeyCount - 1))}
                      className="text-gray-600 hover:text-gray-300 transition-colors py-2"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <span className="text-white font-bold text-sm w-8 text-center tabular-nums">{newKeyCount}</span>
                    <button
                      onClick={() => setNewKeyCount(newKeyCount + 1)}
                      className="text-gray-600 hover:text-gray-300 transition-colors py-2"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <span className="text-gray-600 text-xs">boost{newKeyCount !== 1 ? 's' : ''}</span>
                  </div>
                  <button
                    onClick={createKey}
                    disabled={creatingKey}
                    className="px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-100 transition-all disabled:opacity-60 flex items-center gap-2 shrink-0"
                  >
                    {creatingKey ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    Criar Chave
                  </button>
                </div>
                {keyError && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle size={11} /> {keyError}
                  </p>
                )}
                <p className="text-gray-600 text-xs mt-2">
                  Slots disponíveis: <span className="text-white font-semibold">{stats.total_slots ?? 0}</span>
                </p>
              </div>

              <div className="rounded-2xl bg-gray-950 border border-gray-800 overflow-hidden">
                {keys.length === 0 ? (
                  <div className="p-8 text-center text-gray-600 text-sm">Nenhuma chave criada.</div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    <div className="grid grid-cols-12 px-5 py-2 text-gray-600 text-xs uppercase tracking-wider">
                      <span className="col-span-5">Chave</span>
                      <span className="col-span-2 text-center">Boosts</span>
                      <span className="col-span-2 text-center">Status</span>
                      <span className="col-span-2">Servidor</span>
                      <span className="col-span-1" />
                    </div>
                    {keys.map((k) => (
                      <div key={k.id} className="grid grid-cols-12 px-5 py-3 items-center hover:bg-gray-900/50 transition-colors">
                        <div className="col-span-5 flex items-center gap-2 min-w-0">
                          <code className="text-gray-600 text-xs font-mono truncate">{k.key_value.substring(0, 20)}...</code>
                          <button
                            onClick={() => copyKey(k.key_value, k.id)}
                            className="text-gray-600 hover:text-white transition-colors shrink-0"
                          >
                            {copiedId === k.id ? <Check size={12} className="text-white" /> : <Copy size={12} />}
                          </button>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-white font-bold text-sm">{k.boost_count}</span>
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${k.is_used ? 'bg-gray-900 text-gray-500' : 'bg-gray-900 text-white'}`}>
                            {k.is_used ? 'Usada' : 'Disponível'}
                          </span>
                        </div>
                        <div className="col-span-2 text-gray-600 text-xs truncate">
                          {k.guild_name || '—'}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            onClick={() => deleteKey(k.id)}
                            className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'tasks' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-white font-black text-xl mb-1">Tarefas de Boost</h2>
                <p className="text-gray-500 text-sm">Histórico de operações de impulso</p>
              </div>

              <div className="rounded-2xl bg-gray-950 border border-gray-800 overflow-hidden">
                {tasks.length === 0 ? (
                  <div className="p-8 text-center text-gray-600 text-sm">Nenhuma tarefa registrada.</div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    <div className="grid grid-cols-12 px-5 py-2 text-gray-600 text-xs uppercase tracking-wider">
                      <span className="col-span-3">Servidor</span>
                      <span className="col-span-2 text-center">Status</span>
                      <span className="col-span-2 text-center">Boosts</span>
                      <span className="col-span-3">Data</span>
                      <span className="col-span-2" />
                    </div>
                    {tasks.map((t) => (
                      <div key={t.id} className="grid grid-cols-12 px-5 py-3 items-center hover:bg-gray-900/50 transition-colors">
                        <div className="col-span-3 flex items-center gap-2 min-w-0">
                          {t.guild_icon ? (
                            <img src={t.guild_icon} alt="" className="w-6 h-6 rounded-lg" />
                          ) : (
                            <div className="w-6 h-6 rounded-lg bg-gray-900 flex items-center justify-center text-gray-300 text-xs">
                              {(t.guild_name || 'S')[0]}
                            </div>
                          )}
                          <span className="text-white text-sm truncate">{t.guild_name || 'Desconhecido'}</span>
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.status === 'completed' ? 'bg-gray-900 text-white' :
                            t.status === 'failed' ? 'bg-red-900/30 text-red-400' :
                            'bg-gray-900 text-gray-300'
                          }`}>
                            {t.status === 'completed' ? 'Concluído' : t.status === 'failed' ? 'Falhou' : 'Executando'}
                          </span>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-white font-bold">{t.stats?.total_boosts ?? 0}</span>
                        </div>
                        <div className="col-span-3 text-gray-600 text-xs">
                          {new Date(t.created_at).toLocaleString('pt-BR')}
                        </div>
                        <div className="col-span-2 text-gray-600 text-xs font-mono truncate">{t.id.substring(0, 8)}...</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
