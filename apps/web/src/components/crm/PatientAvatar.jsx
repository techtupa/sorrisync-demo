
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const PatientAvatar = ({ name, initials, className = "w-10 h-10" }) => {
  // Generate a consistent color based on the name string
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
    'bg-orange-100 text-orange-700',
    'bg-teal-100 text-teal-700',
    'bg-indigo-100 text-indigo-700',
    'bg-rose-100 text-rose-700',
    'bg-emerald-100 text-emerald-700'
  ];

  const colorIndex = name ? name.length % colors.length : 0;
  const colorClass = colors[colorIndex];

  return (
    <Avatar className={className}>
      <AvatarFallback className={`${colorClass} font-semibold`}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};

export default PatientAvatar;
