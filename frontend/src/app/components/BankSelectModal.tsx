import { useState } from 'react';
import { Search, X, Check, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface BankItem {
  id: string;
  shortName: string;
  name: string;
  code: string;
  logoBg: string;
  logoColor: string;
  badge: string;
}

export const VIETNAM_BANKS: BankItem[] = [
  { id: 'mb', shortName: 'MBBank (MB)', name: 'Ngân hàng TMCP Quân đội', code: 'MB', logoBg: 'bg-blue-600', logoColor: 'text-white', badge: 'MB' },
  { id: 'vcb', shortName: 'Vietcombank (VCB)', name: 'Ngân hàng TMCP Ngoại thương Việt Nam', code: 'VCB', logoBg: 'bg-emerald-600', logoColor: 'text-white', badge: 'VCB' },
  { id: 'ctg', shortName: 'Vietinbank (CTG)', name: 'Ngân hàng TMCP Công thương Việt Nam', code: 'CTG', logoBg: 'bg-sky-700', logoColor: 'text-white', badge: 'CTG' },
  { id: 'bidv', shortName: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', code: 'BIDV', logoBg: 'bg-teal-700', logoColor: 'text-white', badge: 'BIDV' },
  { id: 'vba', shortName: 'Agribank (VBA)', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam', code: 'VBA', logoBg: 'bg-red-700', logoColor: 'text-white', badge: 'VBA' },
  { id: 'tcb', shortName: 'Techcombank (TCB)', name: 'Ngân hàng TMCP Kỹ thương Việt Nam', code: 'TCB', logoBg: 'bg-red-600', logoColor: 'text-white', badge: 'TCB' },
  { id: 'vpb', shortName: 'VPBank (VPB)', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', code: 'VPB', logoBg: 'bg-green-600', logoColor: 'text-white', badge: 'VPB' },
  { id: 'tpb', shortName: 'TPBank (TPB)', name: 'Ngân hàng TMCP Tiên Phong', code: 'TPB', logoBg: 'bg-purple-600', logoColor: 'text-white', badge: 'TPB' },
  { id: 'acb', shortName: 'ACB', name: 'Ngân hàng TMCP Á Châu', code: 'ACB', logoBg: 'bg-blue-700', logoColor: 'text-white', badge: 'ACB' },
  { id: 'stb', shortName: 'Sacombank (STB)', name: 'Ngân hàng TMCP Sài Gòn Thương Tín', code: 'STB', logoBg: 'bg-blue-800', logoColor: 'text-white', badge: 'STB' },
  { id: 'hdb', shortName: 'HDBank (HDB)', name: 'Ngân hàng TMCP Phát triển TP.HCM', code: 'HDB', logoBg: 'bg-yellow-500', logoColor: 'text-red-900', badge: 'HDB' },
  { id: 'vib', shortName: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam', code: 'VIB', logoBg: 'bg-amber-500', logoColor: 'text-blue-900', badge: 'VIB' },
  { id: 'msb', shortName: 'MSB', name: 'Ngân hàng TMCP Hàng hải Việt Nam', code: 'MSB', logoBg: 'bg-orange-600', logoColor: 'text-white', badge: 'MSB' },
  { id: 'ocb', shortName: 'OCB', name: 'Ngân hàng TMCP Phương Đông', code: 'OCB', logoBg: 'bg-green-700', logoColor: 'text-white', badge: 'OCB' },
  { id: 'shb', shortName: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội', code: 'SHB', logoBg: 'bg-orange-500', logoColor: 'text-white', badge: 'SHB' },
  { id: 'eximbank', shortName: 'Eximbank (EIB)', name: 'Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam', code: 'EIB', logoBg: 'bg-blue-500', logoColor: 'text-white', badge: 'EIB' },
  { id: 'lpbank', shortName: 'LPBank (LPB)', name: 'Ngân hàng TMCP Lộc Phát Việt Nam', code: 'LPB', logoBg: 'bg-amber-600', logoColor: 'text-white', badge: 'LPB' },
  { id: 'seabank', shortName: 'SeABank (SEA)', name: 'Ngân hàng TMCP Đông Nam Á', code: 'SEA', logoBg: 'bg-red-800', logoColor: 'text-white', badge: 'SEA' },
  { id: 'bacabank', shortName: 'Bac A Bank (BAB)', name: 'Ngân hàng TMCP Bắc Á', code: 'BAB', logoBg: 'bg-amber-700', logoColor: 'text-white', badge: 'BAB' },
  { id: 'abbank', shortName: 'ABBANK (ABB)', name: 'Ngân hàng TMCP An Bình', code: 'ABB', logoBg: 'bg-cyan-600', logoColor: 'text-white', badge: 'ABB' },
];

interface BankSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBank: string;
  onSelectBank?: (bankName: string) => void;
  onSelect?: (bank: BankItem | any) => void;
}

export function BankSelectModal({ isOpen, onClose, selectedBank, onSelectBank, onSelect }: BankSelectModalProps) {
  const [search, setSearch] = useState('');

  const filteredBanks = VIETNAM_BANKS.filter(
    b =>
      b.shortName.toLowerCase().includes(search.toLowerCase()) ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Bottom Sheet Modal */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10"
          >
            {/* Handle for sheet */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 flex-shrink-0" />

            {/* Header */}
            <div className="px-5 pb-3 flex items-center justify-between border-b border-gray-100">
              <h3 className="text-gray-900 text-lg font-bold">Chọn ngân hàng</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm theo tên ngân hàng..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-2xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Bank List */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-gray-50 space-y-1">
              {filteredBanks.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  <Landmark className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Không tìm thấy ngân hàng nào phù hợp</p>
                  <button
                    onClick={() => {
                      const trimmed = search.trim();
                      if (trimmed) {
                        if (onSelectBank) onSelectBank(trimmed);
                        if (onSelect) onSelect({ id: 'custom', shortName: trimmed, name: trimmed, code: trimmed, logoBg: 'bg-gray-700', logoColor: 'text-white', badge: 'BANK' });
                        onClose();
                      }
                    }}
                    className="mt-3 text-xs text-blue-600 font-semibold underline cursor-pointer"
                  >
                    Dùng tên "{search.trim()}"
                  </button>
                </div>
              ) : (
                filteredBanks.map(bank => {
                  const isSelected =
                    selectedBank.toLowerCase().includes(bank.code.toLowerCase()) ||
                    selectedBank.toLowerCase().includes(bank.shortName.toLowerCase());

                  return (
                    <button
                      key={bank.id}
                      onClick={() => {
                        if (onSelectBank) onSelectBank(bank.shortName);
                        if (onSelect) onSelect(bank);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3.5 p-3 rounded-2xl transition text-left ${
                        isSelected ? 'bg-blue-50/80 border border-blue-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Bank Logo Badge */}
                      <div
                        className={`w-11 h-11 rounded-2xl ${bank.logoBg} ${bank.logoColor} flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0 tracking-wider`}
                      >
                        {bank.badge}
                      </div>

                      {/* Bank Names */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-gray-900 text-sm font-bold truncate">{bank.shortName}</p>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{bank.name}</p>
                      </div>

                      {/* Selected check */}
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
