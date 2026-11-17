/** Lucide icon paths, drawn at stroke-width 1.6 for a light technical look. */
export const ICON = {
  file: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zM14 2v5h6M8 13h8M8 17h5',
  inbox:
    'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  upload: 'M12 13v8M8 17l4-4 4 4M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 4 16.25',
  db: 'M12 8c4.42 0 8-1.34 8-3s-3.58-3-8-3-8 1.34-8 3 3.58 3 8 3zM4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6',
  mail: 'M4 4h16v16H4zM4 7l8 6 8-6',
  check: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  alert:
    'm10.29 3.86-8.47 14.14A2 2 0 0 0 3.54 21h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0M12 9v4M12 17h.01',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  pulse: 'M22 12h-4l-3 9L9 3l-3 9H2',
  layers: 'm12 2 9 5-9 5-9-5 9-5M3 12l9 5 9-5M3 17l9 5 9-5',
  target:
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  gauge: 'M12 21a9 9 0 1 1 9-9M12 12l4-4',
} as const

export type IconName = keyof typeof ICON
