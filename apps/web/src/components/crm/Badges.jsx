
import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Instagram,
  Search,
  MessageCircle,
  Users,
  Globe,
  Megaphone,
  Building2,
  Stethoscope,
  Activity,
  Sparkles,
  Smile,
  AlertCircle,
  RotateCcw,
  Calendar
} from 'lucide-react';
import { STATUSES, ORIGINS, INTERESTS } from '@/repositories/index.js';

export const PatientStatusBadge = ({ status }) => {
  const config = {
    [STATUSES.NOVO_LEAD]: 'bg-blue-100 text-blue-800 border-blue-200',
    [STATUSES.AVALIACAO_MARCADA]: 'bg-purple-100 text-purple-800 border-purple-200',
    [STATUSES.ORCAMENTO_ENVIADO]: 'bg-orange-100 text-orange-800 border-orange-200',
    [STATUSES.TRATAMENTO_ACEITO]: 'bg-green-100 text-green-800 border-green-200',
    [STATUSES.EM_TRATAMENTO]: 'bg-teal-100 text-teal-800 border-teal-200',
    [STATUSES.FINALIZADO]: 'bg-gray-100 text-gray-800 border-gray-200',
    [STATUSES.RETORNO_PENDENTE]: 'bg-red-100 text-red-800 border-red-200',
    [STATUSES.INATIVO]: 'bg-muted text-muted-foreground border-border',
    [STATUSES.PERDIDO]: 'bg-slate-800 text-slate-100 border-slate-700'
  };

  return (
    <Badge variant="outline" className={`${config[status] || 'bg-gray-100 text-gray-800'} font-medium whitespace-nowrap`}>
      {status}
    </Badge>
  );
};

export const OriginBadge = ({ origin }) => {
  const config = {
    [ORIGINS.INSTAGRAM]: { icon: Instagram, color: 'text-pink-600 bg-pink-50 border-pink-100' },
    [ORIGINS.GOOGLE]: { icon: Search, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    [ORIGINS.WHATSAPP]: { icon: MessageCircle, color: 'text-green-600 bg-green-50 border-green-100' },
    [ORIGINS.INDICACAO]: { icon: Users, color: 'text-purple-600 bg-purple-50 border-purple-100' },
    [ORIGINS.SITE]: { icon: Globe, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    [ORIGINS.TRAFEGO_PAGO]: { icon: Megaphone, color: 'text-orange-600 bg-orange-50 border-orange-100' },
    [ORIGINS.CONVENIO]: { icon: Building2, color: 'text-teal-600 bg-teal-50 border-teal-100' }
  };

  const { icon: Icon, color } = config[origin] || { icon: Globe, color: 'text-gray-600 bg-gray-50 border-gray-100' };

  return (
    <Badge variant="outline" className={`flex items-center gap-1.5 ${color} font-medium whitespace-nowrap`}>
      <Icon className="w-3 h-3" />
      {origin}
    </Badge>
  );
};

export const InterestBadge = ({ interest }) => {
  const config = {
    [INTERESTS.AVALIACAO]: { icon: Calendar, color: 'text-blue-600' },
    [INTERESTS.IMPLANTES]: { icon: Activity, color: 'text-indigo-600' },
    [INTERESTS.PROTESES]: { icon: Stethoscope, color: 'text-purple-600' },
    [INTERESTS.CLAREAMENTO]: { icon: Sparkles, color: 'text-yellow-600' },
    [INTERESTS.ESTETICA]: { icon: Smile, color: 'text-pink-600' },
    [INTERESTS.LIMPEZA]: { icon: Sparkles, color: 'text-teal-600' },
    [INTERESTS.RETORNO]: { icon: RotateCcw, color: 'text-orange-600' },
    [INTERESTS.URGENCIA]: { icon: AlertCircle, color: 'text-red-600' }
  };

  const { icon: Icon, color } = config[interest] || { icon: Stethoscope, color: 'text-gray-600' };

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
      <Icon className={`w-4 h-4 ${color}`} />
      <span>{interest}</span>
    </div>
  );
};
