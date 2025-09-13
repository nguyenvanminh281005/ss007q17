import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const LoginForm: React.FC = () => {
  const [account, setAccount] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { loginWithAccount } = useAuth();

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account.trim()) {
      toast.error('Vui lòng nhập MSSV');
      return;
    }

    setLoading(true);
    try {
      await loginWithAccount(account.trim());
      toast.success('Đăng nhập thành công!');
    } catch (error) {
      toast.error((error as Error).message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Điểm danh lớp SS007Q17
          </h1>
          <p className="text-gray-600">Nhập MSSV để tiếp tục</p>
        </div>

        <form onSubmit={handleStudentLogin} className="space-y-4">
          <div>
            <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-1">
              MSSV
            </label>
            <input
              type="text"
              id="account"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="Nhập MSSV của bạn"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
