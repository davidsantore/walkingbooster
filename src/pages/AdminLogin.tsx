import { useState } from 'react';
import { Zap, Lock, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { adminApi } from '../lib/api';

interface Props {
  onLogin: (token: string) => void;
}

export default function AdminLogin({ onLogin }: Props) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!password) return setError('Digite a senha.');
    setLoading(true);
    try {
      const data = await adminApi.login(password);
      localStorage.setItem('admin_token', data.session_token);
      onLogin(data.session_token);
    } catch (_) {
      setError('Senha incorreta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 relative z-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-xl mb-4">
            <Zap size={26} className="text-black fill-black" />
          </div>
          <h1 className="text-white font-black text-2xl">Painel Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Walking Booster</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-gray-950 border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock size={14} className="text-gray-500" />
            <span className="text-gray-500 text-sm font-medium">Acesso restrito</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha de administrador"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-gray-700 transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
              >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={13} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-white text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
