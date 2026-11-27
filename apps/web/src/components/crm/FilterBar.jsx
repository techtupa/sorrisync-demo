
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUSES, ORIGINS, INTERESTS, RESPONSIBLES } from '@/repositories/index.js';

const defaultOptions = {
  statuses: Object.values(STATUSES),
  origins: Object.values(ORIGINS),
  interests: Object.values(INTERESTS),
  responsibles: Object.values(RESPONSIBLES),
};

const FilterBar = ({ filters, setFilters, options = defaultOptions }) => {
  const handleClear = () => {
    setFilters({
      search: '',
      status: '',
      origin: '',
      interest: '',
      responsible: ''
    });
  };

  const hasActiveFilters = filters.search || filters.status || filters.origin || filters.interest || filters.responsible;

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone, origem ou procedimento..."
          className="pl-9 bg-background"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? '' : v })}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {options.statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.origin} onValueChange={(v) => setFilters({ ...filters, origin: v === 'all' ? '' : v })}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as origens</SelectItem>
            {options.origins.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.interest} onValueChange={(v) => setFilters({ ...filters, interest: v === 'all' ? '' : v })}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Interesse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os interesses</SelectItem>
            {options.interests.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.responsible} onValueChange={(v) => setFilters({ ...filters, responsible: v === 'all' ? '' : v })}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os responsáveis</SelectItem>
            {options.responsibles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          className={`w-full ${hasActiveFilters ? 'text-destructive hover:text-destructive hover:bg-destructive/10' : 'text-muted-foreground'}`}
          onClick={handleClear}
          disabled={!hasActiveFilters}
        >
          <X className="w-4 h-4 mr-2" /> Limpar filtros
        </Button>
      </div>
    </div>
  );
};

export default FilterBar;
