/* Inline Lucide-style icons (24×24, stroke = currentColor). */
const ICONS = {
  home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  habits:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  calendar:'<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M8 2.5v4M16 2.5v4M3 10h18"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  bell:'<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  data:'<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  help:'<circle cx="12" cy="12" r="9.5"/><path d="M9.2 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5"/><path d="M12 17.5h.01"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  minus:'<path d="M5 12h14"/>',
  check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  more:'<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>',
  flame:'<path d="M12 22c4 0 7-2.8 7-7 0-4.5-4-7.5-5-12-2.5 2-3.5 4.5-3.5 7-1-1-1.8-2-2-3.2C6.5 8.500 5 11.4 5 15c0 4.2 3 7 7 7Z"/>',
  star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9Z"/>',
  trophy:'<path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8M9.5 18h5"/>',
  crown:'<path d="m3 7 4.5 4L12 5l4.5 6L21 7l-2 11H5Z"/>',
  leaf:'<path d="M11 20A7 7 0 0 1 4 13C4 7 9 4 20 4c0 11-3 16-9 16Z"/><path d="M4 20c3-5 6-7 10-9"/>',
  sprout:'<path d="M12 21v-9"/><path d="M12 12c0-4 3-7 8-7 0 4-3 7-8 7Z"/><path d="M12 14c0-3-2.5-5.5-7-5.5 0 3.5 2.5 5.5 7 5.5Z"/>',
  drop:'<path d="M12 2.5s6.5 7.2 6.5 12a6.5 6.5 0 0 1-13 0c0-4.8 6.5-12 6.5-12Z"/>',
  run:'<circle cx="15" cy="4" r="2"/><path d="m8 21 3-5 3 2 1 3"/><path d="M6 12l3-4 4 1 2 4 3 1"/><path d="m11 16 2-7"/>',
  book:'<path d="M3 5.5C5.5 4 9 4 12 6c3-2 6.5-2 9-.5V19c-2.5-1.5-6-1.5-9 .5-3-2-6.5-2-9-.5Z"/><path d="M12 6v13.5"/>',
  heart:'<path d="M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20Z"/>',
  dumbbell:'<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  apple:'<path d="M12 7c-1.5-1-5-1.5-6.5 1.5S5 16 7.5 19c1.5 1.8 3 1.5 4.5.8 1.5.7 3 1 4.5-.8C19 16 20 11.5 18.5 8.5S13.5 6 12 7Z"/><path d="M12 7c0-2 1-3.5 3-4"/>',
  ban:'<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  coffee:'<path d="M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6Z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 2.5v3M12 2.5v3"/>',
  brain:'<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1ZM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
  phone:'<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  pill:'<rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-45 12 12)"/><path d="m8.5 8.5 7 7"/>',
  bed:'<path d="M3 19V6M3 14h18v5M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.8"/>',
  pen:'<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  music:'<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  flower:'<circle cx="12" cy="10" r="2.5"/><path d="M12 7.5C12 5 13 3 12 3s0 2-0 4.5M12 12.5v8.5M9.6 9.2C7.5 8 5 8 5 9s2.5 1.5 4.6 1.3M14.4 9.2C16.5 8 19 8 19 9s-2.5 1.5-4.6 1.3M8 21c1-2.5 2.5-3.5 4-3.5s3 1 4 3.5"/>',
  wallet:'<path d="M3 7a2 2 0 0 1 2-2h13v4"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 13.5h2"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  archive:'<rect x="2.5" y="4" width="19" height="5" rx="1.5"/><path d="M4.5 9v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V9M10 13h4"/>',
  restore:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M5.5 6l1 15h11l1-15"/><path d="M10 11v6M14 11v6"/>',
  left:'<path d="m15 18-6-6 6-6"/>', right:'<path d="m9 18 6-6-6-6"/>', down:'<path d="m6 9 6 6 6-6"/>',
  up:'<path d="m18 15-6-6-6 6"/>',
  arrowUp:'<path d="M12 19V5M6 11l6-6 6 6"/>', arrowDown:'<path d="M12 5v14M6 13l6 6 6-6"/>',
  sparkles:'<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  palette:'<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.9 1.8-1.8 0-1.3-1-1.6-1-2.7 0-1 .8-1.5 1.8-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  upload:'<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  download:'<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  info:'<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5h.01"/>',
  skip:'<path d="M5 5l9 7-9 7Z"/><path d="M19 5v14"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  refresh:'<path d="M20 11A8 8 0 0 0 5.5 6.5L3 9M4 13a8 8 0 0 0 14.5 4.5L21 15"/><path d="M3 4v5h5M21 20v-5h-5"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .8 3.5 3 3.5 6"/>',
  file:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/>',
  mountain:'<path d="m3 20 6.5-11 4 6.5 2.5-3.5L21 20Z"/>',
  bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>'
};
function ic(name, extra){ return '<svg class="i'+(extra?' '+extra:'')+'" viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[name]||ICONS.leaf)+'</svg>'; }

/* Icons offered for habits in the editor */
const HABIT_ICONS = ['drop','run','book','bed','moon','heart','dumbbell','apple','ban','coffee','brain','flower','phone','pill','pen','music','wallet','leaf','sun','bolt'];

/* Soft layered-hills landscape used on quote cards and the dashboard banner. */
function landscape(id, tall){
  const g = 'lg'+id;
  return '<svg viewBox="0 0 320 '+(tall?220:160)+'" preserveAspectRatio="xMidYMax slice" aria-hidden="true">'+
  '<defs><linearGradient id="'+g+'s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6E7C8" stop-opacity=".0"/><stop offset="1" stop-color="#F3D9A4" stop-opacity=".75"/></linearGradient>'+
  '<linearGradient id="'+g+'h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9DB57E"/><stop offset="1" stop-color="#5F7D40"/></linearGradient></defs>'+
  (tall?'<g transform="translate(0,60)">':'<g>')+
  '<rect width="320" height="160" fill="url(#'+g+'s)"/>'+
  '<circle cx="232" cy="62" r="20" fill="#FBE3A6" opacity=".9"/>'+
  '<path d="M0 92 C40 70 70 78 104 66 C140 54 170 74 206 64 C244 54 280 70 320 60 V160 H0Z" fill="#B9C7A8" opacity=".75"/>'+
  '<path d="M0 112 C44 92 86 104 128 90 C170 76 206 100 250 90 C282 83 300 90 320 86 V160 H0Z" fill="#94AD76" opacity=".85"/>'+
  '<path d="M0 134 C50 116 92 128 150 114 C200 102 250 124 320 110 V160 H0Z" fill="url(#'+g+'h)"/>'+
  '<path d="M26 160 C28 140 30 128 40 118 M40 118 C34 124 28 124 24 120 C30 114 36 114 40 118 M36 132 C44 124 52 124 56 128 C50 134 42 134 36 132" stroke="#3F5A2A" stroke-width="2" fill="#4E6E35" stroke-linecap="round"/>'+
  '</g></svg>';
}
