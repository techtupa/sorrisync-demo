import { toast as sonner } from 'sonner';
import { english } from './english.js';

function localize(notify) {
  return (message, options) => notify(
    english(message),
    options?.description === undefined
      ? options
      : { ...options, description: english(options.description) },
  );
}

export const toast = Object.assign(localize(sonner), sonner, {
  error: localize(sonner.error),
  info: localize(sonner.info),
  success: localize(sonner.success),
  warning: localize(sonner.warning),
});
