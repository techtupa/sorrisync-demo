const previousPreferenceCodes = new Map([
  ['seg-manha', 'monday-morning'],
  ['ter-tarde', 'tuesday-afternoon'],
  ['qua-manha', 'wednesday-morning'],
  ['qui-tarde', 'thursday-afternoon'],
]);

export const normalizePreference = value => previousPreferenceCodes.get(value) ?? value;
