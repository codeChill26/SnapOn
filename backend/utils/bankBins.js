const BANK_BINS = {
  'Vietcombank': '970436',
  'Techcombank': '970407',
  'BIDV': '970418',
  'VietinBank': '970415',
  'MB Bank': '970422',
  'ACB': '970416',
  'VPBank': '970432',
  'Sacombank': '970403',
  'HDBank': '970437',
  'TPBank': '970423',
  'VIB': '970441',
  'MSB': '970426',
  'Nam A Bank': '970428',
  'OCB': '970448',
  'PVcomBank': '970412',
  'SCB': '970429',
  'SHB': '970443',
  'Eximbank': '970431',
  'Agribank': '970405',
  'LienVietPostBank': '970449',
  'KienLongBank': '970451',
  'Bac A Bank': '970440',
  'ABBank': '970425',
  'SeABank': '970435',
  'BaoViet Bank': '970438',
  'DongA Bank': '970406',
  'GPBank': '970462',
  'OceanBank': '970414',
  'NCB': '970419',
  'VietABank': '970427',
  'VietBank': '970433',
  'PGBank': '970430',
  'VRB': '970421',
  'COOP Bank': '970446',
  'CBBank': '970444',
};

function getBin(bankName) {
  const name = bankName.trim().toLowerCase();
  for (const [key, bin] of Object.entries(BANK_BINS)) {
    if (key.toLowerCase() === name || name.includes(key.toLowerCase())) {
      return bin;
    }
  }
  return null;
}

module.exports = { BANK_BINS, getBin };
