/* =========================================================
   CONFIG — Parròquia Sant Pere Apòstol · Abrera
   Vigília Papal · Montjuïc 2026
   Edita només aquest fitxer per a configurar la web.
   ========================================================= */

window.CONFIG = {
  // Data i hora de la vigília: Dimarts 9 de juny de 2026, 20:00 (Europe/Madrid)
  vigiliaDate: '2026-06-09T20:00:00',

  parrish: 'Sant Pere d\'Abrera · Abrera',
  diocese: 'Diòcesi de Sant Feliu de Llobregat',
  location: 'Montjuïc · Barcelona',

  // URL de l'API de Google Apps Script (desplegada com a web app).
  // Veure README.md per com desplegar. Substitueix pel teu /exec URL.
  sheetsApiUrl: 'https://script.google.com/macros/s/AKfycbxMS4KOd7QJ07XMZQJ2ph5TVJQvIdqHWV3fCWrR_GakyEQj5bEVZpuvAGU0dJqbab1f/exec',

  // Demo mode (stress test): força N intencions aleatòries si no hi ha API.
  // Valors útils per provar la constel·lació: 100, 500, 2000.
  demoIntentions: 0,

  // Valors per defecte si la API no respon
  fallback: {
    metrics: {
      inscrits: 247,
      intencions: 89,
      parroquies: 12,
    },
    intencions: [
      { text: 'Per la pau al món i la fi de tota violència.' },
      { text: 'Pels joves de la nostra diòcesi, que trobin sentit.' },
      { text: 'Per la meva mare, que està malalta.' },
      { text: 'Pels qui han perdut l\'esperança aquest any.' },
      { text: 'Per les famílies que passen dificultats.' },
      { text: 'Per tots els catequistes de la parròquia.' },
      { text: 'Pel nostre Papa i la seva missió.' },
      { text: 'Pels difunts de la nostra comunitat.' },
      { text: 'Pels qui treballen per la justícia.' },
      { text: 'Per la vocació dels joves.' },
      { text: 'Per les víctimes de la guerra.' },
      { text: 'Per la unitat dels cristians.' },
      { text: 'Pels qui se senten sols.' },
      { text: 'Pels missioners arreu del món.' },
      { text: 'Per una conversió veritable del cor.' },
      { text: 'Pel nostre bisbe i els seus col·laboradors.' },
      { text: 'Per la natura i la nostra casa comuna.' },
      { text: 'Pels infants que no tenen família.' },
    ],
    posts: [
      {
        data: '2026-09-15',
        titol_ca: 'Anem cap a Montjuïc',
        titol_es: 'Vamos hacia Montjuïc',
        cos_ca: 'Aquesta vigília no és un acte més. És una nit per aturar-se, mirar enlaire i recordar que no caminem sols. Us convido a preparar el cor durant aquests dies, amb un moment cada dia de silenci i pregària.',
        cos_es: 'Esta vigilia no es un acto más. Es una noche para detenerse, mirar al cielo y recordar que no caminamos solos. Os invito a preparar el corazón durante estos días, con un momento diario de silencio y oración.',
        autor: 'Mn. Josep',
      },
      {
        data: '2026-09-22',
        titol_ca: 'La pregària senzilla',
        titol_es: 'La oración sencilla',
        cos_ca: 'No necessitem paraules grans. N\'hi ha prou amb estar-hi. Una estrella al cel de Montjuïc, una intenció al cor, i la presència silenciosa d\'una comunitat que s\'ha trobat.',
        cos_es: 'No necesitamos palabras grandes. Basta con estar allí. Una estrella en el cielo de Montjuïc, una intención en el corazón, y la presencia silenciosa de una comunidad que se ha encontrado.',
        autor: 'Mn. Josep',
      },
      {
        data: '2026-10-01',
        titol_ca: 'Nou dies abans',
        titol_es: 'Nueve días antes',
        cos_ca: 'Encetem avui una novena com a parròquia. Cada nit, a les 21:00h, deixarem una espelma encesa al campanari. Podeu unir-vos des de casa, des d\'on sigueu. La llum no demana permís.',
        cos_es: 'Comenzamos hoy una novena como parroquia. Cada noche, a las 21:00h, dejaremos una vela encendida en el campanario. Podéis uniros desde casa, desde donde estéis. La luz no pide permiso.',
        autor: 'Mn. Josep',
      },
    ],
    galeria: [],
  },
};
