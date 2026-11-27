
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const CRMInsightCard = ({ icon: Icon, text, metric, colorClass = "text-primary bg-primary/10" }) => {
  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          {metric && <p className="text-xl font-bold text-foreground leading-none mb-1">{metric}</p>}
          <p className="text-sm text-muted-foreground leading-snug">{text}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CRMInsightCard;
