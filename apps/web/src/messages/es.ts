/** Interface texts in Spanish, kept in one place so they can be translated (docs/12). */
export const messages = {
  app: {
    name: 'PetroAtlas',
    tagline: 'Explorador de pozos petroleros',
    description:
      'Mapa de pozos petroleros con series de producción y presión y herramientas de ingeniería.',
    navigation: 'Navegación principal',
    map: 'Mapa',
    sources: 'Fuentes y licencias',
    about: 'Acerca de',
    projectLinks: 'Proyecto',
    language: 'Idioma',
    spanish: 'Español',
    english: 'English',
  },
  map: {
    label: 'Mapa de pozos',
    loading: 'Cargando el mapa base…',
    loadError: 'No se pudo cargar el mapa base. Revisa la conexión y recarga la página.',
    dataError: 'No se pudieron cargar los pozos. Inténtalo de nuevo en unos minutos.',
    colorMode: {
      legend: 'Color de los pozos',
      status: 'Estado',
      type: 'Tipo',
    },
    legend: {
      title: 'Leyenda',
      cluster: 'Grupo de pozos',
      field: 'Campo',
      imported: 'Pozo importado',
      unknownType: 'Sin tipo',
    },
    bubbles: {
      title: 'Mapa de burbujas',
      none: 'Sin burbujas',
      oil: 'Petróleo',
      gas: 'Gas',
      water: 'Agua',
      legend: 'Volumen acumulado',
      loading: 'Cargando los acumulados…',
      loadError: 'No se pudieron cargar los acumulados.',
    },
    /** Overrides for MapLibre's built-in control texts. */
    controls: {
      'NavigationControl.ZoomIn': 'Acercar',
      'NavigationControl.ZoomOut': 'Alejar',
      'NavigationControl.ResetBearing': 'Orientar al norte',
      'AttributionControl.ToggleAttribution': 'Mostrar u ocultar atribución',
      'ScaleControl.Meters': 'm',
      'ScaleControl.Kilometers': 'km',
    },
  },
  filters: {
    label: 'Filtros de pozos',
    title: 'Filtros',
    reset: 'Quitar filtros',
    loading: 'Actualizando el conteo…',
    countError: 'No se pudo actualizar el conteo.',
    resultCount: (count: number) =>
      count === 1 ? '1 pozo' : `${new Intl.NumberFormat('es').format(count)} pozos`,
    optionsLoading: 'Cargando opciones…',
    optionsError: 'No se pudieron cargar los campos.',
    field: 'Campo',
    operator: 'Operadora',
    status: 'Estado',
    type: 'Tipo',
    spudRange: 'Año de perforación',
    spudFrom: 'Desde',
    spudTo: 'Hasta',
    allFields: 'Todos los campos',
    allOperators: 'Todas las operadoras',
    yearPlaceholder: 'AAAA',
  },
  alerts: {
    title: 'Alertas',
    empty: 'Sin alertas activas.',
    loading: 'Cargando alertas…',
    loadError: 'No se pudieron cargar las alertas.',
    asOf: 'Datos al',
    level: {
      critical: 'Crítica',
      warning: 'Advertencia',
    },
    kinds: {
      production_drop: 'Caída de producción',
      high_water_cut: 'Corte de agua alto',
      no_production: 'Sin producción',
    },
    detail: {
      oil7d: 'Petróleo 7 d',
      oilPrev30: 'Petróleo 30 d previos',
      waterCut7d: 'Corte de agua 7 d',
      prod3d: 'Producción 3 d',
    },
  },
  importWells: {
    title: 'Datos propios',
    intro:
      'Importa un CSV de producción con el formato de la documentación. El archivo se valida y se guarda solo en este navegador: nunca se sube al servidor.',
    file: 'Archivo CSV',
    units: 'Unidades del archivo',
    unitsSi: 'SI (Sm³, bar)',
    unitsField: 'Campo (bbl, Mscf, psi)',
    import: 'Importar',
    importing: 'Importando…',
    sourceName: 'Datos importados por el usuario',
    sourceLicense: 'Datos propios; no se redistribuyen',
    readError: 'No se pudo leer el archivo. Comprueba que sea un CSV de texto.',
    saveError: 'No se pudieron guardar los pozos en el navegador. Revisa el espacio disponible.',
    storageUnavailable:
      'Este navegador no permite IndexedDB, así que la importación no está disponible.',
    limits:
      'Límite orientativo: 50 pozos y 200.000 filas por archivo. Por encima, la importación puede tardar y ocupar mucho espacio.',
    softLimit: (wells: number, rows: number) =>
      `El archivo tiene ${String(wells)} pozos y ${String(rows)} filas. ¿Quieres continuar?`,
    confirmImport: 'Continuar',
    cancel: 'Cancelar',
    summary: (wells: number, rows: number, skipped: number) =>
      `Se importaron ${String(rows)} días en ${String(wells)} pozos. ${String(skipped)} días ya estaban cargados y se omitieron.`,
    nothingImported: 'No se añadió ningún día nuevo.',
    totalRows: (rows: number, invalid: number) =>
      `${String(rows)} filas leídas; ${String(invalid)} con errores.`,
    errorsTitle: 'Filas con errores',
    errorsTruncated: (shown: number) =>
      `Se muestran las primeras ${String(shown)} filas con error.`,
    line: 'Línea',
    reason: 'Motivo',
    fatal: {
      empty: 'El archivo está vacío o no tiene cabecera.',
      missing_columns: (columns: readonly string[]) =>
        `Faltan columnas obligatorias: ${columns.join(', ')}.`,
      no_volume_column:
        'El archivo debe incluir al menos una columna de volumen: oil_sm3, gas_sm3 o water_sm3.',
    },
    error: {
      well_required: 'Falta el nombre del pozo.',
      well_too_long: 'El nombre del pozo supera los 64 caracteres.',
      invalid_date: 'La fecha no es válida; usa AAAA-MM-DD.',
      not_a_number: 'El valor no es un número.',
      negative: 'El valor no puede ser negativo.',
      lat_out_of_range: 'La latitud debe estar entre -90 y 90.',
      lon_out_of_range: 'La longitud debe estar entre -180 y 180.',
      on_stream_out_of_range: 'Las horas en línea deben estar entre 0 y 24.',
      no_volume: 'La fila no trae petróleo, gas ni agua.',
      coordinates_required: 'La primera fila de cada pozo debe traer latitud y longitud.',
      duplicate_date: 'La fecha está repetida en el archivo para este pozo.',
      column_count: 'La fila tiene más celdas que la cabecera.',
    },
    listTitle: 'Pozos importados',
    empty: 'Todavía no hay pozos importados.',
    wellSummary: (rows: number, from: string, to: string) =>
      `${String(rows)} días · ${from} – ${to}`,
    open: 'Abrir',
    delete: 'Borrar',
    deleteLabel: (name: string) => `Borrar el pozo importado ${name}`,
    clear: 'Borrar todos los pozos importados',
    clearConfirm:
      '¿Borrar todos los pozos importados de este navegador? Esta acción no se puede deshacer.',
    notice: 'Estos pozos viven solo en este navegador. Si borras los datos del sitio, se pierden.',
    shareNote: 'Los pozos importados no se pueden compartir por URL.',
  },
  sources: {
    title: 'Fuentes y licencias',
    intro:
      'PetroAtlas no redistribuye datos de terceros: el ETL los descarga y la base de datos los sirve con su atribución. Estas son las fuentes cargadas en esta instalación.',
    loading: 'Cargando las fuentes…',
    loadError: 'No se pudieron cargar las fuentes.',
    retry: 'Reintentar',
    license: 'Licencia',
    lastIngest: 'Última ingesta',
    neverIngested: 'Sin ingesta registrada',
    syntheticNote:
      'El conjunto de desarrollo incluye un campo ficticio, CAMPO ESCUELA VENEZUELA, situado en Venezuela y generado por db/seed. No representa un yacimiento real.',
    backToMap: 'Volver al mapa',
  },
  about: {
    title: 'Acerca de PetroAtlas',
    intro:
      'PetroAtlas es un explorador de pozos petroleros de código abierto: mapa, series de producción y presión, registros e ingeniería en el navegador.',
    sections: [
      {
        title: 'Datos de ejemplo',
        paragraphs: [
          'La demo pública usa un campo ficticio de Venezuela, CAMPO ESCUELA VENEZUELA, y veinte pozos VE-01 a VE-20 generados por db/seed.',
          'No son mediciones reales ni representan ningún campo, operadora o pozo existente. Puedes consultar el detalle en la página de datos.',
        ],
      },
      {
        title: 'Código abierto',
        paragraphs: [
          'El código se publica bajo licencia MIT y el paquete de cálculos está disponible en npm y GitHub Packages.',
          'Las decisiones de diseño, la API, la base de datos y las convenciones están documentadas en el repositorio.',
        ],
      },
      {
        title: 'Cómo colaborar',
        paragraphs: [
          'Puedes abrir un issue para reportar un error, proponer una mejora o discutir una fuente de datos.',
          'Las contribuciones siguen CONTRIBUTING.md: una rama corta, pruebas en verde y un PR hacia main. Las traducciones español/inglés se mantienen en los dos diccionarios.',
        ],
      },
    ],
    links: {
      github: 'Repositorio en GitHub',
      npm: 'Paquete en npm',
      docs: 'Documentación',
      data: 'Datos de la demo',
      collaborate: 'Cómo colaborar',
    },
  },
  legal: {
    navigation: 'Información legal',
    updated: 'Última actualización: 10 de noviembre de 2026',
    backToMap: 'Volver al mapa',
    draftNote:
      'Este texto describe el estado actual del proyecto y no constituye asesoramiento jurídico. Antes de una explotación pública debe revisarlo un profesional y completarse con los datos legales del titular.',
    footer: {
      copyright: '© 2026 PetroAtlas. Código bajo licencia MIT.',
      data: 'Los datos pertenecen a sus fuentes.',
      demoData: 'Demo con datos sintéticos de Venezuela; no son mediciones reales.',
      github: 'GitHub',
      npm: 'npm',
      about: 'Acerca de',
    },
    notice: {
      title: 'Aviso legal',
      intro:
        'PetroAtlas es un proyecto de código abierto de carácter informativo y educativo. Este aviso regula el acceso a la aplicación y el uso de sus contenidos.',
      sections: [
        {
          title: 'Titular',
          paragraphs: [
            'El titular y mantenedor del proyecto es Luis Angel Gutierrez, con sitio web luisangelgutierrez.com y residencia en Venezuela. PetroAtlas es el nombre definitivo del proyecto.',
            'Las vías de contacto disponibles son su sitio web y el repositorio del proyecto en GitHub.',
          ],
          links: [
            {
              href: 'https://luisangelgutierrez.com',
              label: 'Sitio web de Luis Angel Gutierrez',
            },
            {
              href: 'https://github.com/SuricatoAviones/petro-atlas',
              label: 'Repositorio de PetroAtlas',
            },
          ],
        },
        {
          title: 'Objeto',
          paragraphs: [
            'La aplicación permite consultar datos públicos de pozos petroleros, ver series de producción y presión y ejecutar cálculos de ingeniería en el navegador.',
            'Es una herramienta informativa y educativa. No presta servicios de consultoría, no certifica resultados y no sustituye el criterio de un profesional.',
          ],
        },
        {
          title: 'Propiedad intelectual',
          paragraphs: [
            'El código se distribuye bajo licencia MIT. Puedes reutilizarlo, modificarlo y redistribuirlo con las condiciones de esa licencia.',
            'Los datos de terceros conservan sus propias licencias y se muestran con su fuente. El repositorio no redistribuye esos datos.',
            'Las marcas, los nombres de campos, las operadoras y los demás signos distintivos pertenecen a sus titulares.',
          ],
        },
        {
          title: 'Enlaces externos',
          paragraphs: [
            'La aplicación enlaza a fuentes y servicios de terceros. No controlamos su contenido, disponibilidad ni políticas, y no respondemos de ellos.',
          ],
        },
        {
          title: 'Responsabilidad',
          paragraphs: [
            'La información puede estar incompleta, desactualizada o contener errores. No se garantiza la disponibilidad continua ni la exactitud de los datos o de los cálculos.',
            'En la medida en que la ley lo permita, el titular no responde de los daños derivados del uso de la aplicación ni de las decisiones tomadas a partir de sus resultados.',
          ],
        },
        {
          title: 'Modificaciones y jurisdicción',
          paragraphs: [
            'Este aviso puede actualizarse cuando cambie la aplicación o la normativa aplicable. La fecha de actualización indica la versión vigente.',
            'Las controversias se someterán a los tribunales competentes de Venezuela, sin perjuicio de las normas imperativas que resulten aplicables.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Privacidad',
      intro:
        'Esta página explica qué datos puede tratar PetroAtlas, para qué se usan y cómo ejercer tus derechos.',
      sections: [
        {
          title: 'Responsable',
          paragraphs: [
            'El responsable del proyecto es Luis Angel Gutierrez, con sitio web luisangelgutierrez.com y residencia en Venezuela. PetroAtlas es el nombre definitivo del proyecto.',
            'Para cualquier consulta sobre privacidad, utiliza su sitio web o el repositorio del proyecto en GitHub.',
          ],
          links: [
            {
              href: 'https://luisangelgutierrez.com',
              label: 'Sitio web de Luis Angel Gutierrez',
            },
            {
              href: 'https://github.com/SuricatoAviones/petro-atlas',
              label: 'Repositorio de PetroAtlas',
            },
          ],
        },
        {
          title: 'Datos que se tratan',
          paragraphs: [
            'La aplicación no tiene cuentas de usuario, formularios de contacto ni cookies. No se recogen nombres, correos electrónicos ni datos de perfil.',
            'El servidor que aloja la aplicación puede registrar direcciones IP, fecha, ruta solicitada, agente de usuario y código de respuesta en sus registros de acceso. Son datos técnicos necesarios para la seguridad y el diagnóstico.',
            'El mapa solicita teselas a OpenFreeMap, que recibe la dirección IP y los datos técnicos necesarios para servir las teselas.',
          ],
        },
        {
          title: 'Finalidad y base jurídica',
          paragraphs: [
            'Los registros se usan para mantener la seguridad, prevenir abusos y diagnosticar fallos. La base jurídica es el interés legítimo en mantener el servicio disponible y seguro.',
            'No se elaboran perfiles ni se toman decisiones automatizadas sobre las personas.',
          ],
        },
        {
          title: 'Conservación',
          paragraphs: [
            'Los registros se conservan el tiempo necesario para las finalidades anteriores y según la configuración del proveedor de alojamiento. No se conservan más allá de lo necesario para la seguridad y el diagnóstico.',
          ],
        },
        {
          title: 'Destinatarios',
          paragraphs: [
            'No se venden ni se ceden datos personales. Solo acceden a ellos el proveedor de alojamiento y los servicios técnicos necesarios, como el servicio de teselas del mapa, cada uno con su propia política.',
          ],
        },
        {
          title: 'Derechos',
          paragraphs: [
            'Puedes solicitar el acceso, la rectificación, la supresión, la oposición, la limitación y la portabilidad de tus datos. Para ejercerlos, contacta a través del sitio web luisangelgutierrez.com o del repositorio de GitHub.',
            'También puedes presentar una reclamación ante la autoridad de protección de datos competente.',
          ],
        },
        {
          title: 'Cambios',
          paragraphs: [
            'Esta política puede actualizarse cuando cambie la aplicación o el tratamiento de datos. La fecha de actualización indica la versión vigente.',
          ],
        },
      ],
    },
    data: {
      title: 'Datos',
      intro:
        'PetroAtlas muestra datos públicos de pozos y calcula sobre ellos en el navegador. Esta página resume su origen, sus límites y cómo se atribuyen.',
      sections: [
        {
          title: 'Datos de ejemplo',
          paragraphs: [
            'Este despliegue usa únicamente datos sintéticos de ejemplo: un campo ficticio en Venezuela llamado CAMPO ESCUELA VENEZUELA y veinte pozos VE-01 a VE-20, generados por db/seed.',
            'No son mediciones reales ni representan ningún yacimiento, operadora o pozo existente. No se usan datos de Sodir, Volve ni Diskos.',
          ],
        },
        {
          title: 'Datos sintéticos',
          paragraphs: [
            'CAMPO ESCUELA VENEZUELA es un conjunto ficticio generado por db/seed. Las cifras siguen tendencias plausibles, pero no son mediciones de ningún pozo real.',
          ],
        },
        {
          title: 'Cálculos',
          paragraphs: [
            'Los cálculos de ingeniería se ejecutan en el navegador con petro-calc. No se envían a la API ni se almacenan en el servidor.',
            'Los resultados son estimaciones basadas en correlaciones publicadas y en los datos disponibles. No sustituyen un estudio de yacimiento.',
          ],
        },
        {
          title: 'Licencias y atribución',
          paragraphs: [
            'Cada fuente conserva su licencia. La página Fuentes y licencias muestra las fuentes cargadas en esta instalación y su licencia.',
            'El uso de los datos mostrados se rige por la licencia de cada fuente. PetroAtlas no concede derechos adicionales sobre ellos.',
          ],
          links: [
            { href: '/fuentes', label: 'Fuentes y licencias' },
            {
              href: 'https://github.com/SuricatoAviones/petro-atlas/blob/main/docs/10-fuentes-de-datos.md',
              label: 'Documentación de las fuentes',
            },
            { href: '/aviso-legal', label: 'Aviso legal' },
          ],
        },
        {
          title: 'Exactitud',
          paragraphs: [
            'Los datos pueden estar desactualizados o incompletos. Antes de usarlos en una decisión, consulta la fuente original y verifica sus condiciones de uso.',
          ],
        },
      ],
    },
    cookies: {
      title: 'Cookies',
      intro:
        'Esta página explica qué cookies y tecnologías similares usa PetroAtlas y cómo puedes gestionarlas.',
      sections: [
        {
          title: 'Qué son',
          paragraphs: [
            'Las cookies son archivos que un sitio guarda en el navegador. También existen tecnologías similares, como el almacenamiento local y las bases de datos del navegador.',
          ],
        },
        {
          title: 'Cookies que usamos',
          paragraphs: [
            'Actualmente PetroAtlas no utiliza cookies propias ni de terceros, ni herramientas de analítica, publicidad o seguimiento.',
            'Por ese motivo no se muestra un panel de consentimiento de cookies.',
          ],
        },
        {
          title: 'Servicios externos',
          paragraphs: [
            'El mapa carga teselas de OpenFreeMap. Esa petición puede incluir la dirección IP y datos técnicos del navegador, pero no instala cookies de PetroAtlas.',
          ],
        },
        {
          title: 'Almacenamiento local',
          paragraphs: [
            'Si importas un CSV, los pozos se guardan en IndexedDB dentro de tu navegador. El archivo no se envía al servidor y esos datos no se comparten con otras personas. Puedes borrarlos desde el panel de datos propios o eliminando los datos del sitio en la configuración del navegador.',
          ],
        },
        {
          title: 'Cómo gestionarlas',
          paragraphs: [
            'Puedes bloquear o eliminar cookies desde la configuración de tu navegador. Como no se usan cookies no esenciales, no hay un panel de consentimiento que configurar.',
          ],
        },
        {
          title: 'Cambios',
          paragraphs: [
            'Esta página puede actualizarse si se añaden cookies o tecnologías similares. La fecha de actualización indica la versión vigente.',
          ],
        },
      ],
    },
  },
  wellSheet: {
    title: 'Ficha del pozo',
    close: 'Cerrar la ficha',
    loading: 'Cargando la ficha…',
    loadError: 'No se pudo cargar la ficha del pozo.',
    seriesError: 'No se pudieron cargar las series del pozo.',
    wellsAtPoint: 'Pozos en este punto',
    tabs: {
      label: 'Secciones de la ficha',
      summary: 'Ficha',
      production: 'Producción',
      operation: 'Operación',
      trajectory: 'Trayectoria',
      logs: 'Registros',
      engineering: 'Ingeniería',
      diagnostics: 'Diagnóstico',
    },
    units: {
      legend: 'Unidades',
      si: 'SI',
      field: 'Campo',
    },
    charts: {
      source: 'Fuente',
      table: 'Ver tabla',
      hideTable: 'Ocultar tabla',
      date: 'Fecha',
      zoomHint: 'Arrastra o rueda sobre una gráfica para hacer zoom; las gráficas se sincronizan.',
      noData: 'Sin datos para esta gráfica.',
      loading: 'Cargando las gráficas…',
      exportCsv: 'Exportar CSV',
      exportPng: 'Exportar PNG',
      tableOf: 'Tabla de',
    },
    production: {
      noData: 'La fuente no publica producción diaria para este pozo.',
      rates: 'Tasas de producción',
      waterCutGor: 'Corte de agua y RGP',
      cumulative: 'Volúmenes acumulados',
      injection: 'Inyección de agua',
      oil: 'Petróleo',
      gas: 'Gas',
      water: 'Agua',
      waterInj: 'Agua inyectada',
      waterCut: 'Corte de agua',
      gor: 'RGP',
      cumulativeOil: 'Petróleo',
      cumulativeGas: 'Gas',
      cumulativeWater: 'Agua',
    },
    fit: {
      title: 'Ajuste de Arps',
      useView: 'Usar la ventana visible',
      clear: 'Quitar ajuste',
      window: 'Ventana',
      qi: 'qi',
      di: 'Di',
      b: 'b',
      r2: 'R²',
      noFit: 'La ventana necesita al menos 6 días con producción positiva.',
      loadedFrom: 'Calculado con los datos visibles; la curva se superpone a la tasa de petróleo.',
    },
    engineering: {
      title: 'Ingeniería',
      model: 'Modelo',
      vogel: 'Vogel',
      fetkovich: 'Fetkovich',
      composite: 'Compuesta',
      reservoirPressure: 'Presión de yacimiento (bar)',
      flowingPressure: 'Presión de fondo fluyente (bar)',
      rate: 'Caudal de prueba (Sm³/d)',
      secondFlowingPressure: 'Segunda presión fluyente (bar)',
      secondRate: 'Segundo caudal (Sm³/d)',
      bubblePoint: 'Presión de burbuja (bar)',
      productivityIndex: 'Índice de productividad (Sm³/d/bar)',
      ipr: 'Curva IPR',
      iprChart: 'Presión de fondo frente a caudal',
      pvt: 'Propiedades PVT',
      api: 'Gravedad API',
      gasGravity: 'Gravedad del gas',
      temperature: 'Temperatura (°F)',
      solutionGas: 'Gas en solución (scf/STB)',
      standing: 'Standing',
      vasquez: 'Vasquez-Beggs',
      result: 'Resultado',
      bubble: 'Presión de burbuja',
      formationVolume: 'Factor volumétrico',
      viscosity: 'Viscosidad',
      pvtBo: 'Bo frente a presión',
      pvtRs: 'Rs frente a presión',
      pvtViscosity: 'Viscosidad frente a presión',
      inputError: 'Revisa los parámetros: la correlación no puede evaluarse con estos valores.',
    },
    diagnostics: {
      title: 'Diagnóstico',
      chan: 'Chan: RAP',
      chanDerivative: 'Chan: derivada del RAP',
      rateVsCumulative: 'Tasa frente a acumulado',
      productivityIndex: 'Índice de productividad',
      reservoirPressure: 'Presión de yacimiento (bar)',
      days: 'Días',
      positiveOnly: 'Escala logarítmica: solo se dibujan los valores positivos.',
      pressureError: 'La presión de yacimiento debe ser mayor que cero.',
      noData: 'La fuente no publica las series necesarias para el diagnóstico.',
      noWater: 'La fuente no publica la producción de agua de este pozo.',
      noPressure: 'La fuente no publica la presión de fondo de este pozo.',
    },
    trajectory: {
      title: 'Trayectoria',
      noData: 'La fuente no publica la trayectoria de este pozo.',
      depth: 'Profundidad vertical',
      displacement: 'Desplazamiento horizontal',
      measuredDepth: 'Profundidad medida',
      inclination: 'Inclinación',
      azimuth: 'Azimut',
    },
    logs: {
      title: 'Registros de pozo',
      noData: 'La fuente no publica registros para este pozo.',
      loading: 'Cargando los registros…',
      error: 'No se pudieron cargar los registros del pozo.',
      depth: 'Profundidad (m)',
      tracks: 'Pistas de registros',
      trackLabel: (mnemonic: string, unit: string | null) =>
        unit === null ? mnemonic : `${mnemonic} (${unit})`,
      zoomHint:
        'Arrastra o rueda sobre una pista para hacer zoom en profundidad; las pistas se sincronizan.',
      unavailableForImported: 'Los pozos importados desde CSV no incluyen registros.',
      las: {
        title: 'Archivo LAS',
        open: 'Abrir archivo LAS',
        reading: 'Leyendo el archivo LAS…',
        clear: 'Cerrar LAS',
        hint: 'El archivo se lee en tu navegador y no se sube al servidor.',
        sourceName: 'Archivo LAS local',
        sourceLicense: 'Datos locales; no se suben',
        errors: {
          empty: 'El archivo está vacío.',
          no_curves: 'No se encontraron curvas en la sección ~C.',
          no_data: 'No hay datos en la sección ~A.',
          no_depth: 'La primera curva debe ser de profundidad (DEPT, DEPTH, MD o TVD).',
          bad_value: 'Hay un valor no numérico en los datos.',
          incomplete_row: 'Una fila no tiene tantos valores como curvas.',
          wrapped: 'Los archivos con WRAP. YES no son compatibles.',
          too_large: 'El archivo supera los 20 MB.',
          read_error: 'No se pudo leer el archivo.',
        },
      },
    },
    comparison: {
      title: 'Comparación de pozos',
      intro:
        'Añade otros pozos del mismo campo para comparar sus tasas en la misma gráfica. Cada pozo usa un estilo de línea distinto y el color sigue indicando el fluido.',
      selectLabel: 'Pozo para comparar',
      add: 'Añadir',
      remove: 'Quitar',
      noCandidates: 'No hay otros pozos con producción diaria en este campo.',
      loading: 'Cargando pozos del campo…',
      error: 'No se pudieron cargar los pozos del campo.',
      importedNote:
        'Los pozos importados solo existen en este navegador: la comparación no se guarda en la URL.',
      shareNote:
        'La lista de pozos comparados se guarda en la URL; los pozos importados no se pueden compartir.',
      maxReached: (max: number) => `Puedes comparar hasta ${String(max)} pozos a la vez.`,
      fluid: 'Fluido',
      chartTitle: 'Tasas comparadas',
    },
    operation: {
      noData: 'La fuente no publica datos de operación para este pozo.',
      pressures: 'Presiones',
      temperatures: 'Temperaturas',
      choke: 'Choke',
      onStream: 'Horas en línea',
      bhp: 'Presión de fondo',
      whp: 'Presión de cabecera',
      bht: 'Temperatura de fondo',
      wht: 'Temperatura de cabecera',
      chokeLabel: 'Apertura de choke',
      onStreamLabel: 'Horas en línea',
    },
    status: 'Estado',
    type: 'Tipo',
    field: 'Campo',
    operator: 'Operadora',
    spudDate: 'Fecha de perforación',
    totalDepth: 'Profundidad total',
    location: 'Ubicación',
    openInOsm: 'Abrir en OpenStreetMap',
    series: 'Series disponibles',
    daily: 'Producción diaria',
    dailyRange: (from: string, to: string, days: number) =>
      `${from} – ${to} (${String(days)} días)`,
    noDaily: 'Sin producción diaria',
    trajectoryLabel: 'Trayectoria',
    available: 'Disponible',
    unavailable: 'No disponible',
    logCurves: 'Registros',
    noLogs: 'Sin registros',
    source: 'Fuente',
    license: 'Licencia',
    noData: 'Sin dato',
    exportCsv: 'Descargar CSV del pozo',
    exportCsvNote: 'Series diarias en SI, con una fila por día y la fuente en cada fila.',
    importedNotice:
      'Pozo importado desde un CSV en este navegador. Los datos no están en el servidor ni se comparten por URL.',
    importedAlert: 'Alerta calculada en el navegador con las mismas reglas que los pozos públicos.',
  },
  wellStatus: {
    producing: 'Produciendo',
    injecting: 'Inyectando',
    shut_in: 'Cerrado',
    abandoned: 'Abandonado',
    unknown: 'Desconocido',
  },
  wellType: {
    producer: 'Productor',
    injector: 'Inyector',
    exploration: 'Exploración',
    observation: 'Observación',
  },
};

/** Shape of every interface dictionary; `en.ts` must provide all of it. */
export type Messages = typeof messages;
