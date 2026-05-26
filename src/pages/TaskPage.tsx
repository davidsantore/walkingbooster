import { useEffect, useState, useRef } from 'react';
import { Zap, CheckCircle2, XCircle, Loader2, RotateCcw, Shield } from 'lucide-react';
import { boostApi } from '../lib/api';

interface Props {
  taskId: string;
  guild: { guild_id: string; guild_name: string; guild_icon: string };
  onReset: () => void;
}

interface TaskData {
  status: string;
  stats: Record<string, number>;
  tokens: Array<{ token_short: string; join_status: string; boost_status: string; slots_used: number }>;
  guild: { guild_id: string; guild_name: string; guild_icon: string };
}

const STATUS_COLOR: Record<string, string> = {
  waiting: 'text-gray-500 bg-gray-900',
  joined: 'text-gray-300 bg-gray-800',
  failed: 'text-red-400 bg-red-900/30',
  boosted: 'text-white bg-gray-800',
  boosting: 'text-gray-300 bg-gray-800',
  skipped: 'text-gray-500 bg-gray-900',
  no_slots: 'text-gray-400 bg-gray-800',
};

const STATUS_PT: Record<string, string> = {
  waiting: 'Aguardando',
  joined: 'Entrou',
  failed: 'Falhou',
  boosted: 'Impulsionado',
  boosting: 'Impulsionando',
  skipped: 'Pulado',
  no_slots: 'Sem slots',
};

export default function TaskPage({ taskId, guild: initialGuild, onReset }: Props) {
  const [task, setTask] = useState<TaskData | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    async function poll() {
      try {
        const data = await boostApi.getTask(taskId);
        setTask(data);
        if (data.status === 'completed' || data.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch (_) {}
    }

    poll();
    pollRef.current = setInterval(poll, 1500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [taskId]);

  const guild = task?.guild || initialGuild;
  const stats = task?.stats || {};
  const tokens = task?.tokens || [];
  const status = task?.status || 'pending';
  const total = tokens.length;
  const done = tokens.filter((t) => t.join_status !== 'waiting').length;
  const pct = total ? Math.round((done / total) * 100) : (status === 'completed' ? 100 : 0);

  const isRunning = status === 'pending' || status === 'running';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  return (
    <div className="min-h-screen bg-black flex flex-col relative z-10">
      {/* Header */}
      <header className="border-b border-gray-900 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
          <img src="/IMG_5192.gif" alt="Walking Booster" className="w-10 h-10 object-contain" />
          <span className="font-bold text-white text-sm tracking-wide">Walking <span className="text-gray-400">Booster</span></span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 space-y-5">
        {/* Guild card */}
        <div className="rounded-2xl bg-gray-950 border border-gray-800 p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-gray-800 overflow-hidden flex items-center justify-center text-2xl font-bold text-gray-300 shrink-0">
            {guild.guild_icon ? (
              <img src={guild.guild_icon} alt="" className="w-full h-full object-cover" />
            ) : (
              (guild.guild_name || 'S')[0]
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base truncate">{guild.guild_name || 'Servidor'}</p>
            <p className="text-gray-500 text-xs font-mono">{guild.guild_id}</p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${isCompleted ? 'bg-gray-800 text-white' : isFailed ? 'bg-red-900/30 text-red-400' : 'bg-gray-800 text-gray-300'}`}>
            {isRunning && <Loader2 size={11} className="animate-spin" />}
            {isCompleted && <CheckCircle2 size={11} />}
            {isFailed && <XCircle size={11} />}
            {isRunning ? 'Executando' : isCompleted ? 'Concluído' : 'Falhou'}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: stats.total ?? 0 },
            { label: 'Entrou', value: stats.joined ?? 0 },
            { label: 'Boostados', value: stats.boosted ?? 0 },
            { label: 'Falhou', value: stats.failed ?? 0 },
            { label: 'Boosts', value: stats.total_boosts ?? 0 },
            { label: 'Tempo', value: `${elapsed}s` },
          ].map((s, i) => (
            <div key={i} className="rounded-xl bg-gray-950 border border-gray-800 p-3 text-center">
              <p className="text-lg font-black text-white">{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="rounded-2xl bg-gray-950 border border-gray-800 p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-500 text-xs font-medium">Progresso</span>
            <span className="text-white font-bold tabular-nums">{isCompleted ? 100 : pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-900 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${isCompleted ? 100 : pct}%`,
                background: isFailed ? '#ef4444' : '#ffffff',
              }}
            />
          </div>
          {isCompleted && (
            <p className="text-white text-xs mt-2 font-medium">
              Concluído — {stats.total_boosts ?? 0} boost{(stats.total_boosts ?? 0) !== 1 ? 's' : ''} aplicado{(stats.total_boosts ?? 0) !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Token table */}
        {tokens.length > 0 && (
          <div className="rounded-2xl bg-gray-950 border border-gray-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
              <Shield size={13} className="text-gray-500" />
              <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Tokens</span>
            </div>
            <div className="divide-y divide-gray-800">
              <div className="grid grid-cols-4 px-5 py-2 text-gray-600 text-xs uppercase tracking-wider">
                <span>Token</span>
                <span>Entrou</span>
                <span>Boost</span>
                <span className="text-right">Slots</span>
              </div>
              {tokens.map((t, i) => (
                <div key={i} className="grid grid-cols-4 px-5 py-2.5 items-center hover:bg-gray-900/50 transition-colors">
                  <span className="text-gray-500 text-xs font-mono truncate pr-2">{t.token_short}...</span>
                  <span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[t.join_status] || STATUS_COLOR.waiting}`}>
                      {STATUS_PT[t.join_status] || t.join_status}
                    </span>
                  </span>
                  <span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[t.boost_status] || STATUS_COLOR.waiting}`}>
                      {STATUS_PT[t.boost_status] || t.boost_status}
                    </span>
                  </span>
                  <span className="text-white text-sm font-bold text-right">{t.slots_used}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reset button */}
        {!isRunning && (
          <button
            onClick={onReset}
            className="w-full h-12 rounded-2xl bg-gray-900 border border-gray-800 text-gray-300 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-all"
          >
            <RotateCcw size={14} />
            Novo Resgate
          </button>
        )}
      </main>
    </div>
  );
}
