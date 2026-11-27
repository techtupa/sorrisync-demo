import { inventoryDecimalHundredths } from './inventoryPurchasesContract.js';

const integer = (v) => typeof v === 'string' && /^\d+$/.test(v);
export const inventoryCostSnapshotIsValid = (s, itemId) => Boolean(s && s.item_id === itemId
  && typeof s.available === 'boolean' && (!s.available || (integer(s.revision) && BigInt(s.revision) > 0n
    && integer(s.quantity_hundredths) && BigInt(s.quantity_hundredths) <= 99999999999n
    && typeof s.unit_code === 'string' && typeof s.item_updated_at === 'string'
    && typeof s.manual_origin === 'boolean' && s.method_version === 'moving_average_v1'
    && (s.value_scaled === null || (integer(s.value_scaled) && BigInt(s.value_scaled) < 10n ** 38n))
    && (s.quantity_hundredths !== '0' || s.value_scaled === '0'))));

const decimalMoney = (units, digits, trim = false) => {
  const scale = 10n ** BigInt(digits), whole = units / scale;
  let fraction = (units % scale).toString().padStart(digits, '0');
  if (trim) fraction = fraction.replace(/0+$/, '').padEnd(2, '0');
  return `R$ ${new Intl.NumberFormat('pt-BR').format(whole)},${fraction}`;
};
const halfUp = (n, d) => (2n * n + d) / (2n * d);
export const formatInventoryCostValue = (scaled) => {
  if (scaled === null || !integer(scaled)) return 'Custo não informado';
  const v = BigInt(scaled);
  if (v > 0n && v < 1000000n) return 'menor que R$ 0,01';
  return decimalMoney(halfUp(v, 1000000n), 2);
};
export const formatInventoryCostAverage = (s) => {
  if (!s?.available) return 'Valoração indisponível';
  if (s.quantity_hundredths === '0') return 'Sem saldo';
  if (s.value_scaled === null) return 'Custo não informado';
  const v = BigInt(s.value_scaled), q = BigInt(s.quantity_hundredths);
  if (v > 0n && v < q) return 'menor que R$ 0,000001';
  return decimalMoney(halfUp(v, q), 6, true);
};
export const inventoryCostStateLabel = (s) => !s?.available ? 'Valoração indisponível'
  : s.quantity_hundredths === '0' ? 'Sem saldo' : s.value_scaled === null ? 'Custo não informado' : 'Custo definido';
export const validateInventoryCostBasis = (price) => {
  const cents = inventoryDecimalHundredths(price);
  return cents === null || cents < 0n || cents > 99999999n
    ? { valid: false, message: 'Informe custo entre R$ 0,00 e R$ 999.999,99, com até duas casas decimais.' }
    : { valid: true, cents: cents.toString() };
};
export const inventoryCostEventLabel = (kind) => ({ baseline: 'Início do custeio', receipt: 'Recebimento de compra',
  exit: 'Saída pela média vigente', manual_unknown: 'Entrada sem custo', unit_change: 'Mudança de unidade',
  basis_initial: 'Custo de referência definido', basis_correction: 'Custo de referência corrigido' }[kind] || 'Evento operacional');
export const isInventoryCostKnownRefusal = (error) => ['PT409','22023','42501','55000','23514','22P02','22003'].includes(error?.code);
export const inventoryCostErrorMessage = (error) => error?.code === '42501' ? 'Seu acesso atual não permite consultar ou definir custos nesta clínica.'
  : error?.code === 'PT409' ? 'O saldo, a unidade ou a versão mudou. Atualize, revise o custo e tente novamente.'
    : error?.code === '55000' ? 'A valoração está indisponível por inconsistência. Nenhuma alteração foi confirmada; solicite verificação técnica.'
      : ['22023','23514','22P02','22003'].includes(error?.code) ? 'Revise o custo e os limites informados.'
        : 'Resultado não confirmado. Recupere a mesma solicitação antes de continuar.';
