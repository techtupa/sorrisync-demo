
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const FinanceStatCard = ({ icon: Icon, value, label, description, variation, variationLabel, trend }) => {
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';

  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow group">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Icon className="w-5 h-5" />
          </div>
          {variation && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : isNegative ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}`}>
              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : isNegative ? <ArrowDownRight className="w-3 h-3" /> : null}
              {variation}
            </div>
          )}
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground tracking-tight mb-1">{value}</p>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {(description || variationLabel) && (
            <p className="text-xs text-muted-foreground mt-2">
              {description} {variationLabel && <span className="opacity-70">{variationLabel}</span>}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FinanceStatCard;
