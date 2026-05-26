import { useState, useRef } from 'react';
import { Zap, Key, Link2, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { boostApi } from '../lib/api';
import TaskPage from './TaskPage';

export default function RedeemPage() {
  const [key, setKey] = useState('');
  const [invite, setInvite] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ title: string; msg: string } | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ guild_id: string; guild_name: string; guild_icon: string } | null>(null);
  const keyRef = useRef<HTMLInputElement>(null);

  const progress = Math.min(100, (key.length / 60) * 100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!key) return setError({ title: 'Chave ausente', msg: 'Por favor, insira sua chave de boost.' });
    if (key.length !== 60) return setError({ title: 'Chave inválida', msg: 'A chave deve ter exatamente 60 caracteres.' });
    if (!invite) return setError({ title: 'Convite ausente', msg: 'Por favor, insira o link de convite do servidor.' });

    setLoading(true);
    try {
      const data = await boostApi.redeem(key, invite);
      setGuild(data.guild);
      setTaskId(data.task_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      if (msg.toLowerCase().includes('already used') || msg.toLowerCase().includes('já usada')) {
        setError({ title: 'Chave já utilizada', msg: 'Esta chave já foi resgatada.' });
      } else if (msg.toLowerCase().includes('not found')) {
        setError({ title: 'Chave não encontrada', msg: 'Esta chave não existe ou é inválida.' });
      } else if (msg.toLowerCase().includes('invite')) {
        setError({ title: 'Convite inválido', msg: 'O link de convite é inválido ou expirou.' });
      } else {
        setError({ title: 'Erro', msg: msg });
      }
    } finally {
      setLoading(false);
    }
  }

  if (taskId && guild) {
    return <TaskPage taskId={taskId} guild={guild} onReset={() => { setTaskId(null); setGuild(null); setKey(''); setInvite(''); }} />;
  }

  return (
    <div className="min-h-screen bg-black flex flex-col relative z-10">
      {/* Header */}
      <header className="border-b border-gray-900 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
          <img src="/IMG_5192.gif" alt="Walking Booster" className="w-10 h-10 object-contain" />
          <span className="font-bold text-white text-sm tracking-wide">Walking <span className="text-gray-400">Booster</span></span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-gray-800 text-gray-300 text-xs font-semibold mb-8 tracking-wider uppercase">
          <Zap size={10} className="fill-gray-300" />
          Resgate de Chaves
        </div>

        {/* Hero */}
        <h1 className="text-4xl sm:text-5xl font-black text-white text-center mb-3 leading-tight">
          Resgate sua<br />
          <span className="text-gray-200">chave Boost</span>
        </h1>
        <p className="text-gray-400 text-center text-sm max-w-sm mb-12 leading-relaxed">
          Insira sua chave e o link de convite do servidor para impulsionar instantaneamente seu servidor.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-4">
          {/* Key input */}
          <div className="rounded-2xl bg-gray-950 border border-gray-800 p-5 transition-all duration-200 focus-within:border-gray-700 focus-within:bg-gray-900">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-gray-800 flex items-center justify-center">
                <Key size={14} className="text-gray-300" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Digite sua chave</p>
                <p className="text-gray-500 text-xs">Cole a chave de 60 caracteres fornecida pelo vendedor.</p>
              </div>
            </div>
            <input
              ref={keyRef}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              maxLength={60}
              placeholder="Cole aqui sua chave de 60 caracteres"
              className="w-full bg-black/30 border border-gray-800 rounded-xl px-4 py-2.5 text-gray-200 text-sm placeholder-gray-600 outline-none focus:border-gray-700 transition-colors font-mono"
            />
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-gray-900 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    background: key.length === 60 ? '#ffffff' : 'rgba(255,255,255,0.3)',
                  }}
                />
              </div>
              <span className="text-gray-500 text-xs tabular-nums">{key.length} / 60</span>
            </div>
          </div>

          {/* Invite input */}
          <div className="rounded-2xl bg-gray-950 border border-gray-800 p-5 transition-all duration-200 focus-within:border-gray-700 focus-within:bg-gray-900">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-gray-800 flex items-center justify-center">
                <Link2 size={14} className="text-gray-300" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Link de convite do servidor</p>
                <p className="text-gray-500 text-xs">Digite o servidor que você deseja impulsionar.</p>
              </div>
            </div>
            <input
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder="https://discord.gg/convite-code"
              className="w-full bg-black/30 border border-gray-800 rounded-xl px-4 py-2.5 text-gray-200 text-sm placeholder-gray-600 outline-none focus:border-gray-700 transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/8 border border-red-500/20">
              <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-red-400 text-sm font-semibold">{error.title}</p>
                <p className="text-red-400/70 text-xs mt-0.5">{error.msg}</p>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-white text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Zap size={15} className="fill-black" />
                Resgatar e Impulsionar
                <ChevronRight size={14} />
              </>
            )}
          </button>
        </form>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-4 text-center">
        <p className="text-gray-600 text-xs">Visionario Boosting &mdash; Impulsos instantâneos para o seu servidor</p>
      </footer>
    </div>
  );
}
