
import React from 'react';

const TimelineItem = ({ date, title, description, icon: Icon, isLast = false }) => {
  return (
    <div className="flex gap-4 relative">
      {!isLast && (
        <div className="absolute left-[19px] top-10 bottom-[-16px] w-px bg-border/60"></div>
      )}
      <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center border-4 border-card">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="pb-6 pt-1">
        <p className="text-xs text-muted-foreground mb-1">{date}</p>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );
};

export default TimelineItem;
